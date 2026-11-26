import { randomInt } from 'node:crypto';
import QRCode from 'qrcode';
import { one, all, run } from './storage.js';
import { fail, fraction, selectQuestions, safeQuestion } from './learning.js';

function questionTime(question) {
  const base = {'biết':15, 'hiểu':25, 'vận dụng':35}[question.level] ?? 25;
  const format = question.type === 'boolean' ? 10 : question.type === 'short' ? 5 : 0;
  const reading = question.table?.length || question.context || question.media ? 10 : 0;
  return (base + format + reading) * 1000;
}

function answerControls({id,type,options,numberFields}) {
  if (type === 'choice') return {id,type,optionCount:options.length};
  if (type === 'boolean') return {id,type,statementCount:options?.length || 1};
  return {id,type,numberFields:numberFields?.map(({unit}) => ({unit}))};
}

async function advanceExpired(room, questions, now) {
  while (room.state === 'playing') {
    const started = Number(room.question_started ?? now);
    let index = room.idx, nextStart = started;
    while (index < questions.length && now >= nextStart + questionTime(questions[index])) {
      nextStart += questionTime(questions[index++]);
    }
    if (index === room.idx && room.question_started !== null) break;
    const state = index === questions.length ? 'ended' : 'playing';
    const changed = await run(`UPDATE rooms SET state=?,idx=?,question_started=?
      WHERE code=? AND state='playing' AND idx=?
      AND (question_started=? OR (question_started IS NULL AND CAST(? AS BIGINT) IS NULL))`,
    state,index,state === 'playing' ? nextStart : null,room.code,room.idx,room.question_started,room.question_started);
    if (changed) return {...room,state,idx:index,question_started:state === 'playing' ? nextStart : null};
    room = await one('SELECT * FROM rooms WHERE code=?',room.code);
  }
  return room;
}

export async function roomAction({ path, method, body, user, session }) {
  if (path === '/api/rooms' && method === 'POST') {
    if (!['teacher','guest'].includes(user?.role)) fail(403,'Hãy đăng nhập giáo viên hoặc mở phiên khách để tạo phòng.');
    const grade = Number(body.grade);
    const questions = selectQuestions(grade, null, 'room', false);
    let room;
    do {
      const code = String(randomInt(100000,1000000));
      room = await one(`INSERT INTO rooms(code,teacher,team_mode,state,idx,questions,created,grade)
        VALUES(?,?,?,'lobby',-1,?,?,?) ON CONFLICT(code) DO NOTHING RETURNING code`,
      code,user.id,Number(body.teamMode === true),JSON.stringify(questions),Date.now(),grade);
    } while (!room);
    return room;
  }
  const match = path.match(/^\/api\/rooms\/(\d{6})(?:\/(join|next|answer))?$/);
  if (!match) fail(404,'Không tìm thấy phòng.');
  const [,code,action] = match;
  let room = await one('SELECT rooms.*,users.guest_until host_until FROM rooms JOIN users ON users.id=rooms.teacher WHERE rooms.code=?',code);
  if (!room || (room.host_until && Number(room.host_until) <= Date.now())) fail(404,'Mã phòng không hợp lệ hoặc phòng đã hết hạn.');
  const questions = JSON.parse(room.questions);
  const host = user?.id === room.teacher;
  const player = await one('SELECT name,team FROM players WHERE code=? AND token=?',code,session);
  const now = Date.now();
  if (host || player) room = await advanceExpired(room,questions,now);
  if (method === 'GET' && !action) {
    const state = {code,state:room.state,index:room.idx,count:questions.length,teamMode:!!room.team_mode,host,joined:!!player,answered:false,players:[],stats:[]};
    if (!player && !host) return state;
    state.players = await all(`SELECT p.name,p.team,CAST(COALESCE(SUM(COALESCE(r.points,r.correct)),0) AS INTEGER) score FROM players p
      LEFT JOIN responses r ON r.code=p.code AND r.token=p.token WHERE p.code=?
      GROUP BY p.code,p.token ORDER BY score DESC,p.name`,code);
    if (room.state === 'playing') {
      const question = questions[room.idx];
      state.durationMs = questionTime(question);
      state.deadline = Number(room.question_started) + state.durationMs;
      state.question = host ? safeQuestion(question) : answerControls(question);
      const response = player && await one('SELECT points,correct FROM responses WHERE code=? AND token=? AND idx=?',code,session,room.idx);
      state.answered = !!response;
      if (response) state.points = response.points ?? response.correct;
      state.remainingMs = Math.max(0,state.deadline - Date.now());
    }
    if (host && room.state === 'ended') {
      const rows = await all('SELECT idx,CAST(SUM(correct) AS INTEGER) hits,CAST(COUNT(*) AS INTEGER) submitted FROM responses WHERE code=? GROUP BY idx',code);
      state.stats = questions.map((q,i) => {
        const row = rows.find(r => r.idx === i);
        return {prompt:q.prompt,right:row?.hits || 0,wrong:(row?.submitted || 0)-(row?.hits || 0),skipped:state.players.length-(row?.submitted || 0)};
      });
    }
    return state;
  }
  if (method !== 'POST') fail(405,'Phương thức không được hỗ trợ.');
  if (action === 'join') {
    if (player) return {ok:true};
    if (room.state !== 'lobby') fail(409,'Phòng đã bắt đầu.');
    const name = String(body.name || '').trim();
    const team = room.team_mode ? String(body.team || '').trim() : '';
    if (!name || name.length>48 || (room.team_mode && (!team || team.length>48))) fail(400,'Hãy nhập tên và đội hợp lệ.');
    const inserted = await run(`INSERT INTO players(code,token,name,team)
      SELECT code,?,?,? FROM rooms WHERE code=? AND state='lobby' ON CONFLICT DO NOTHING`,session,name,team,code);
    if (!inserted && !await one('SELECT 1 FROM players WHERE code=? AND token=?',code,session)) {
      if (!await one("SELECT 1 FROM rooms WHERE code=? AND state='lobby'",code)) fail(409,'Phòng đã bắt đầu.');
      fail(409,'Tên này đã có người dùng trong phòng.');
    }
    return {ok:true};
  }
  if (action === 'next') {
    if (!host) fail(403,'Chỉ chủ phòng được chuyển câu.');
    if (body.index !== undefined && body.index !== room.idx) return {ok:true};
    if (room.state === 'ended') return {ok:true};
    if (room.state === 'lobby' && !await one('SELECT 1 FROM players WHERE code=?',code)) fail(409,'Hãy chờ một người chơi vào phòng.');
    const ended = room.idx + 1 >= questions.length;
    await run('UPDATE rooms SET state=?,idx=?,question_started=? WHERE code=? AND idx=?',
      ended ? 'ended' : 'playing',room.idx+1,ended ? null : Date.now(),code,room.idx);
    return {ok:true};
  }
  if (action === 'answer') {
    if (!player || room.state !== 'playing') fail(409,'Chưa thể gửi câu trả lời.');
    const question = questions[room.idx];
    if (body.questionId !== question.id) fail(409,'Phòng đã chuyển câu, hãy thử câu hiện tại.');
    const answer = question.type === 'choice' && Number.isInteger(body.answer) ? question.options[body.answer] : body.answer;
    const correct = Number(fraction(question,answer) === 1);
    const elapsed = Math.max(0,now - Number(room.question_started));
    const duration = questionTime(question);
    if (elapsed >= duration) fail(409,'Câu hỏi đã hết giờ.');
    const points = correct ? Math.round(1000 - 500 * elapsed / duration) : 0;
    const inserted = await run(`INSERT INTO responses(code,token,idx,correct,points) SELECT code,?,idx,?,? FROM rooms
      WHERE code=? AND idx=? AND state='playing' AND question_started=? ON CONFLICT(code,token,idx) DO NOTHING`,
    session,correct,points,code,room.idx,room.question_started);
    if (!inserted && !await one('SELECT 1 FROM responses WHERE code=? AND token=? AND idx=?',code,session,room.idx)) {
      fail(409,'Phòng đã chuyển câu, hãy thử câu hiện tại.');
    }
    return {ok:true};
  }
  fail(404,'Không tìm thấy thao tác.');
}

export async function roomQR(code, origin) {
  if (!await one('SELECT 1 FROM rooms JOIN users ON users.id=rooms.teacher WHERE rooms.code=? AND (users.guest_until IS NULL OR users.guest_until>?)',code,Date.now())) fail(404,'Không tìm thấy phòng.');
  return QRCode.toString(new URL('/phong-hoc?room='+code,origin).href,{type:'svg',margin:3,width:240});
}
