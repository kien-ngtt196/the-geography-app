import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { one, all, run, teacherKey, hosted } from './storage.js';
import { fail, gradeAttempt, lessons, safeQuestion, selectQuestions } from './learning.js';
import { roomAction, roomQR } from './rooms.js';
import { pages } from './public/routes.js';
import { chapters } from './content/chapters.js';

const derive = promisify(scrypt);
const files = fileURLToPath(new URL('./public/',import.meta.url));
const hash = s => createHash('sha256').update(s).digest('hex');
const month = 30*86400000;
const guestLifetime = 86400000;
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const limits = new Map();
function limit(key, maximum) {
  const previous = limits.get(key);
  const bucket = previous?.until > Date.now() ? previous : {count:0,until:Date.now()+600000};
  limits.set(key,bucket);
  if (++bucket.count > maximum) fail(429,'Có nhiều yêu cầu liên tiếp. Hãy thử lại sau ít phút.');
}
function clientAddress(req) {
  const forwarded = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'];
  if (process.env.VERCEL === '1' && typeof forwarded === 'string') {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  return req.socket?.remoteAddress || 'unknown';
}
let lastCleanup = Date.now();
export async function cleanExpired() {
  const now = Date.now();
  for (const [key,entry] of limits) if (entry.until < now) limits.delete(key);
  await run('DELETE FROM sessions WHERE expires<?',now);
  await run('DELETE FROM attempts WHERE user_id IS NULL AND date<?',new Date(now-month).toISOString());
  const cutoff = now-60000;
  if (!await one('SELECT 1 FROM users WHERE guest_until<? LIMIT 1',cutoff)) return;
  const guests = 'SELECT id FROM users WHERE guest_until<?';
  const demoRooms = `SELECT code FROM rooms WHERE teacher IN (${guests})`;
  await run(`DELETE FROM responses WHERE code IN (${demoRooms})`,cutoff);
  await run(`DELETE FROM players WHERE code IN (${demoRooms})`,cutoff);
  await run(`DELETE FROM rooms WHERE teacher IN (${guests})`,cutoff);
  await run(`DELETE FROM attempts WHERE user_id IN (${guests})`,cutoff);
  await run(`DELETE FROM sessions WHERE user_id IN (${guests})`,cutoff);
  await run('DELETE FROM users WHERE guest_until<?',cutoff);
}

async function jsonBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) fail(415,'Cần gửi dữ liệu JSON.');
  const parts = [];
  let size = 0;
  for await (const part of req) {
    if ((size+=part.length)>64000) fail(413,'Dữ liệu quá lớn.');
    parts.push(part);
  }
  try {
    const value = JSON.parse(Buffer.concat(parts));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  fail(400,'Dữ liệu gửi lên không hợp lệ.');
}
function currentUser(id) {
  return id ? one(`SELECT u.id,u.name,CASE WHEN u.guest_until IS NULL THEN u.role ELSE 'guest' END role,
    u.grade,COALESCE(u.class_code,t.class_code,'') "classCode"
    FROM users u LEFT JOIN users t ON t.id=u.teacher_id WHERE u.id=? AND (u.guest_until IS NULL OR u.guest_until>?)`,id,Date.now()) : null;
}
async function setSession(res, userId, expires = Date.now()+month) {
  const secret = randomBytes(32).toString('hex');
  const token = hash(secret);
  await run('INSERT INTO sessions VALUES(?,?,?)',token,userId,expires);
  const secure = process.env.PUBLIC_ORIGIN?.startsWith('https://') || process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie','atlas='+secret+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+Math.ceil((expires-Date.now())/1000)+secure);
  return token;
}
async function teacherByCode(code) {
  const teacher = await one("SELECT id FROM users WHERE role='teacher' AND class_code=?",String(code || '').trim().toUpperCase());
  if (!teacher) fail(400,'Không tìm thấy lớp có mã này.');
  return teacher.id;
}
async function authenticate(path,body) {
  const name = typeof body.name === 'string' ? body.name.trim().normalize('NFC') : '';
  const password = body.password;
  if (!name || name.length>64 || typeof password!=='string' || password.length>256) fail(400,'Tên hoặc mật khẩu không hợp lệ.');
  const login = name.toLocaleLowerCase('vi');
  if (path.endsWith('/login')) {
    const row = await one('SELECT id,password FROM users WHERE login=? AND guest_until IS NULL',login);
    const [salt,h] = (row?.password || 'empty:'+ '00'.repeat(64)).split(':');
    const key = await derive(password,salt,64);
    if (!timingSafeEqual(key,Buffer.from(h,'hex')) || !row) fail(401,'Tên hoặc mật khẩu chưa đúng.');
    return row.id;
  }
  if (!['teacher','student'].includes(body.role) || password.length<8) fail(400,'Chọn vai trò và nhập mật khẩu từ 8 ký tự.');
  const teacher = body.role === 'teacher';
  const grade = teacher ? null : Number(body.grade);
  if (!teacher && ![8,9].includes(grade)) fail(400,'Hãy chọn khối lớp của học sinh.');
  if (teacher && !teacherKey) fail(503,'Máy chủ chưa được cấu hình mã đăng ký giáo viên.');
  if (teacher && hash(String(body.teacherKey || '')) !== hash(teacherKey)) fail(403,'Mã đăng ký giáo viên chưa đúng.');
  const teacherId = !teacher && body.classCode ? await teacherByCode(body.classCode) : null;
  const salt = randomBytes(16).toString('hex');
  const digest = (await derive(password,salt,64)).toString('hex');
  for (;;) {
    const code = teacher ? randomBytes(4).toString('hex').toUpperCase() : null;
    const created = await one(`INSERT INTO users(name,login,password,role,class_code,teacher_id,grade)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING id`,name,login,salt+':'+digest,body.role,code,teacherId,grade);
    if (created) return created.id;
    if (await one('SELECT 1 FROM users WHERE login=?',login)) fail(409,'Tên đăng nhập đã được dùng.');
  }
}

async function progress(user) {
  const attempts = await all('SELECT grade,mode,lesson,date,result FROM attempts WHERE user_id=? AND result IS NOT NULL ORDER BY date DESC',user.id);
  const misses = new Map();
  const history = attempts.map(({result,...a}) => {
    const {score,total,items} = JSON.parse(result);
    for (const item of items) {
      if (!item.lessonId) continue;
      const key = a.grade+'|'+item.lessonId;
      const v = misses.get(key) || {incorrect:0,count:0};
      v.count++; v.incorrect+=Number(!item.correct); misses.set(key,v);
    }
    return {...a,score,total};
  });
  const weakest = [...misses].filter(([,v])=>v.incorrect).sort((a,b)=>b[1].incorrect/b[1].count-a[1].incorrect/a[1].count)[0];
  let recommendation = null;
  if (weakest) {
    const [g,id] = weakest[0].split('|');
    const l = lessons(+g).find(l=>l.id===id);
    if (l) recommendation={grade:+g,id,title:l.title};
  }
  const scoreExpression = hosted ? "CAST(CAST(a.result AS JSON) ->> 'score' AS DOUBLE PRECISION)" : "json_extract(a.result,'$.score')";
  const students = user.role==='teacher' ? await all(`SELECT u.name,CAST(COUNT(a.id) AS INTEGER) attempts,
    COALESCE(SUM(${scoreExpression}),0) score,CAST(COUNT(a.id)*10 AS INTEGER) total, MAX(a.date) "lastDate",
    (SELECT lesson FROM attempts WHERE user_id=u.id AND result IS NOT NULL ORDER BY date DESC LIMIT 1) "lastLesson"
    FROM users u LEFT JOIN attempts a ON a.user_id=u.id AND a.result IS NOT NULL
    WHERE u.teacher_id=? GROUP BY u.id ORDER BY u.name`,user.id) : [];
  return {attempts:history,students,recommendation};
}
async function handle(req,res) {
  const url = new URL(req.url,'http://localhost');
  const path = decodeURIComponent(url.pathname), method = req.method;
  res.setHeader('X-Content-Type-Options','nosniff');
  if (!path.startsWith('/api/')) {
    if (method!=='GET' && method!=='HEAD') fail(405,'Phương thức không hợp lệ.');
    const route = path.replace(/\/$/,'') || '/';
    const page = Object.hasOwn(pages,route) ? pages[route] : null;
    const target = resolve(files,page?.file || '.'+path);
    if (!target.startsWith(resolve(files)+sep)) fail(404,'Không tìm thấy.');
    const info = await stat(target).catch(()=>null);
    if (!info?.isFile()) fail(404,'Không tìm thấy tệp.');
    res.setHeader('Content-Type',(types[extname(target)] || 'application/octet-stream') + (/\.(html|css|js|json)$/.test(target)?'; charset=utf-8':''));
    if (method==='HEAD') return res.end();
    return createReadStream(target).on('error',()=>res.destroy()).pipe(res);
  }
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const secret = req.headers.cookie?.match(/(?:^|;\s*)atlas=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (process.env.VERCEL === '1' && Date.now() - lastCleanup > 600000) {
    lastCleanup = Date.now();
    await cleanExpired();
  }
  if (method==='GET' && path==='/api/health') {
    await one('SELECT 1');
    return res.end(JSON.stringify({ok:true}));
  }
  let session = secret && await one('SELECT token,user_id FROM sessions WHERE token=? AND expires>?',hash(secret),Date.now());
  const user = await currentUser(session?.user_id);
  const mustLogin = () => { if (!user) fail(401,'Hãy đăng nhập để tiếp tục.'); };
  let body = {};
  let address;
  if (method==='POST') {
    const origin = req.headers.origin;
    if (origin && origin!==process.env.PUBLIC_ORIGIN && new URL(origin).host!==req.headers.host) fail(403,'Nguồn yêu cầu không hợp lệ.');
    body = await jsonBody(req);
    address = clientAddress(req);
    if (!session && path!=='/api/guest-login') {
      limit('session:'+address,480);
      session={token:await setSession(res,null)};
    }
  }
  let output;
  if (method==='GET' && path==='/api/me') output={user};
  else if (method==='GET' && path==='/api/catalog') {
    mustLogin();
    const grade = Number(url.searchParams.get('grade'));
    output={lessons:lessons(grade).map(({id,title,summary,questions})=>({id,title,summary,count:questions.length}))};
  } else if (method==='GET' && path==='/api/chapters') {
    mustLogin();
    const grade = Number(url.searchParams.get('grade'));
    if (!Object.hasOwn(chapters,grade)) fail(400,'Hãy chọn lớp 8 hoặc lớp 9.');
    output={chapters:chapters[grade]};
  } else if (method==='POST' && path==='/api/guest-login') {
    if (user && user.role !== 'guest') fail(409,'Hãy đăng xuất trước khi mở phiên khách.');
    if (user) output={user};
    else {
      limit('guest:'+address,40);
      const expires = Date.now()+guestLifetime;
      const {id} = await one("INSERT INTO users(name,login,password,role,guest_until) VALUES(?,?,?,'student',?) RETURNING id",
        'Khách','guest-'+randomUUID(),'!',expires);
      await setSession(res,id,expires);
      if (session) await run('DELETE FROM sessions WHERE token=?',session.token);
      output={user:await currentUser(id)};
    }
  } else if (method==='POST' && ['/api/login','/api/register'].includes(path)) {
    limit('auth:'+address,120);
    const id = await authenticate(path,body);
    await run('DELETE FROM sessions WHERE token=?',session.token);
    await setSession(res,id); output={user:await currentUser(id)};
  } else if (method==='POST' && path==='/api/logout') {
    await run('DELETE FROM sessions WHERE token=?',session.token);
    res.setHeader('Set-Cookie','atlas=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'); output={user:null};
  } else if (method==='POST' && path==='/api/class') {
    mustLogin(); if(user.role!=='student') fail(403,'Chỉ học sinh được tham gia lớp.');
    await run('UPDATE users SET teacher_id=? WHERE id=?',await teacherByCode(body.classCode),user.id); output={user:await currentUser(user.id)};
  } else if (method==='POST' && path==='/api/student-grade') {
    mustLogin();
    const grade = Number(body.grade);
    if (user.role !== 'student' || user.grade !== null) fail(403,'Khối lớp đã được thiết lập.');
    if (![8,9].includes(grade)) fail(400,'Hãy chọn lớp 8 hoặc lớp 9.');
    await run('UPDATE users SET grade=? WHERE id=? AND grade IS NULL',grade,user.id);
    output={user:await currentUser(user.id)};
  } else if (method==='GET' && path==='/api/progress') {
    mustLogin(); output=await progress(user);
  } else if (method==='POST' && path==='/api/attempts') {
    if (!['practice','exam'].includes(body.mode)) fail(400,'Chế độ không hợp lệ.');
    if (body.mode==='exam') mustLogin();
    limit('attempt:'+session.token,120);
    const grade = Number(body.grade);
    const lessonId = user && body.mode==='practice' ? body.lessonId : null;
    const questions = selectQuestions(grade,lessonId,body.mode,!user,body.examPaper);
    if (!questions.length) fail(404,'Bài này chưa có câu hỏi.');
    const label = body.mode==='exam' && body.examPaper==='midterm1' ? 'Giữa kì I · Phần trắc nghiệm' :
      lessons(grade).find(l=>l.id===lessonId)?.title || (user?'Ôn tập tổng hợp':'Trải nghiệm');
    const id = randomUUID(), expiresAt = body.mode==='exam' ? Date.now()+45*60000 : null;
    await run('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,NULL,?)',id,session.token,user?.id || null,grade,body.mode,label,JSON.stringify(questions),expiresAt,new Date().toISOString());
    output={id,questions:questions.map(safeQuestion),expiresAt};
  } else if (method==='POST' && /^\/api\/attempts\/[\w-]+\/submit$/.test(path)) {
    const attempt=await one('SELECT * FROM attempts WHERE id=?',path.split('/')[3]);
    if (!attempt || (attempt.user_id ? attempt.user_id!==user?.id : attempt.owner!==session.token)) fail(404,'Không tìm thấy lượt học.');
    if (attempt.result) output=JSON.parse(attempt.result);
    else {
      if (attempt.expires && Date.now()>Number(attempt.expires)+15000) fail(409,'Đã hết thời gian nộp bài.');
      if (!body.answers || typeof body.answers!=='object' || Array.isArray(body.answers)) fail(400,'Cần gửi câu trả lời.');
      output=gradeAttempt(JSON.parse(attempt.questions),body.answers,attempt.mode);
      const saved = await one('UPDATE attempts SET result=? WHERE id=? AND result IS NULL RETURNING result',JSON.stringify(output),attempt.id);
      if (!saved) output=JSON.parse((await one('SELECT result FROM attempts WHERE id=?',attempt.id)).result);
    }
  } else if (path.startsWith('/api/rooms')) {
    if (method==='POST' && path==='/api/rooms' && user?.role === 'guest') limit('guest-room:'+session.token,30);
    output=await roomAction({path,method,body,user,session:session?.token || ''});
  } else if (method==='GET' && path==='/api/qr') {
    const scheme = process.env.VERCEL === '1' ? 'https' : 'http';
    const svg=await roomQR(url.searchParams.get('code') || '',process.env.PUBLIC_ORIGIN || scheme+'://'+req.headers.host);
    res.setHeader('Content-Type','image/svg+xml'); return res.end(svg);
  } else fail(404,'Không tìm thấy chức năng.');
  res.end(JSON.stringify(output));
}
export const handleRequest = (req,res)=>handle(req,res).catch(error=>{
  if (!error.status) console.error('Request failed:',error.code || error.name);
  res.writeHead(error.status || 500,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({error:error.status?error.message:'Máy chủ chưa xử lý được yêu cầu.'}));
});
