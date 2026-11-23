import { randomInt } from 'node:crypto';
import QRCode from 'qrcode';
import { one, all, run } from './storage.js';
import { fail, fraction, selectQuestions, safeQuestion } from './learning.js';

export function roomAction({ path, method, body, user, session }) {
  if (path === '/api/rooms' && method === 'POST') {
    if (user?.role !== 'teacher') fail(403,'Giáo viên cần đăng nhập để mở phòng.');
    const grade = Number(body.grade);
    const questions = selectQuestions(grade, null, 'room', false);
    let code;
    do { code = String(randomInt(100000,1000000)); } while (one('SELECT 1 FROM rooms WHERE code=?',code));
    run("INSERT INTO rooms(code,teacher,team_mode,state,idx,questions,created,grade) VALUES(?,?,?,'lobby',-1,?,?,?)",code,user.id,Number(body.teamMode === true),JSON.stringify(questions),Date.now(),grade);
    return {code};
  }
  const match = path.match(/^\/api\/rooms\/(\d{6})(?:\/(join|next|answer))?$/);
  if (!match) fail(404,'Không tìm thấy phòng.');
  const [,code,action] = match;
  const room = one('SELECT * FROM rooms WHERE code=?',code);
  if (!room) fail(404,'Mã phòng không hợp lệ.');
  if (user?.role === 'student' && room.grade && user.grade !== room.grade) {
    fail(403,'Phòng này dành cho học sinh lớp '+room.grade+'.');
  }
  const questions = JSON.parse(room.questions);
  const host = user?.id === room.teacher;
  const player = one('SELECT name,team FROM players WHERE code=? AND token=?',code,session);
  if (method === 'GET' && !action) {
    const state = {code,state:room.state,index:room.idx,count:questions.length,teamMode:!!room.team_mode,host,joined:!!player,answered:false,players:[],stats:[]};
    if (!player && !host) return state;
    state.players = all(`SELECT p.name,p.team,COALESCE(SUM(r.correct),0) score FROM players p
      LEFT JOIN responses r ON r.code=p.code AND r.token=p.token WHERE p.code=?
      GROUP BY p.token ORDER BY score DESC,p.name`,code);
    if (room.state === 'playing') {
      state.question = safeQuestion(questions[room.idx]);
      state.answered = !!one('SELECT 1 FROM responses WHERE code=? AND token=? AND idx=?',code,session,room.idx);
    }
    if (host && room.state === 'ended') {
      const rows = all('SELECT idx,SUM(correct) AS hits, COUNT(*) AS submitted FROM responses WHERE code=? GROUP BY idx',code);
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
    if (one('SELECT 1 FROM players WHERE code=? AND name=?',code,name)) fail(409,'Tên này đã có người dùng trong phòng.');
    run('INSERT INTO players VALUES(?,?,?,?)',code,session,name,team);
    return {ok:true};
  }
  if (action === 'next') {
    if (!host) fail(403,'Chỉ chủ phòng được chuyển câu.');
    if (body.index !== undefined && body.index !== room.idx) return {ok:true};
    if (room.state === 'ended') return {ok:true};
    if (room.state === 'lobby' && !one('SELECT 1 FROM players WHERE code=?',code)) fail(409,'Hãy chờ một người chơi vào phòng.');
    run('UPDATE rooms SET state=?,idx=? WHERE code=?',room.idx+1 >= questions.length ? 'ended':'playing',room.idx+1,code);
    return {ok:true};
  }
  if (action === 'answer') {
    if (!player || room.state !== 'playing') fail(409,'Chưa thể gửi câu trả lời.');
    if (body.questionId !== questions[room.idx].id) fail(409,'Phòng đã chuyển câu, hãy thử câu hiện tại.');
    run('INSERT OR IGNORE INTO responses VALUES(?,?,?,?)',code,session,room.idx,Number(fraction(questions[room.idx],body.answer)===1));
    return {ok:true};
  }
  fail(404,'Không tìm thấy thao tác.');
}

export function roomQR(code, origin) {
  if (!one('SELECT 1 FROM rooms WHERE code=?',code)) fail(404,'Không tìm thấy phòng.');
  return QRCode.toString(new URL('/phong-hoc?room='+code,origin).href,{type:'svg',margin:3,width:240});
}
