import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { lessons, fraction, selectQuestions, safeQuestion, gradeAttempt } from '../learning.js';

test('Đề giữa kì I lớp 9 khớp thứ tự, phạm vi và điểm phần khách quan', () => {
  const questions = selectQuestions(9,null,'exam',false,'midterm1');
  const types = questions.map(q=>q.type);
  assert.deepEqual(types,[...Array(8).fill('choice'),'boolean','boolean','short','short']);
  assert.deepEqual(new Set(questions.map(q=>q.lessonId)),new Set(['g9_l1','g9_l2','g9_l3','g9_l5']));
  assert.deepEqual(questions.slice(0,8).map(q=>q.answer[0]),['B','B','D','A','B','D','C','B']);
  assert.deepEqual(questions.slice(8,10).map(q=>q.answer),[['Đ','S','S','Đ'],['Đ','Đ','S','Đ']]);
  assert.equal(fraction(questions[10],'309'),1);
  assert.equal(fraction(questions[11],'19.0'),1);
  assert.equal(fraction(questions[11],'18,9'),1);
  assert.ok(questions.every(q=>!('acceptedAnswers' in safeQuestion(q))));
  const allRight = Object.fromEntries(questions.map(q=>[q.id,q.answer]));
  assert.equal(gradeAttempt(questions,allRight,'exam').objectiveScore,7);
  const oneStatement = {[questions[8].id]:['Đ','','','']};
  assert.equal(gradeAttempt(questions,oneStatement,'exam').objectiveScore,0.25);
  assert.throws(()=>selectQuestions(8,null,'exam',false,'midterm1'));
  assert.ok(selectQuestions(8,null,'exam',false).filter(q=>q.type==='boolean').every(q=>q.answer.length===4));
});

test('Câu trả lời ngắn công bố đơn vị và chấm phần số', () => {
  const bank = [8,9].flatMap(grade=>lessons(grade).flatMap(lesson=>lesson.questions));
  const midterm = selectQuestions(9,null,'exam',false,'midterm1');
  const questions = [...bank,...midterm].filter(question=>question.type==='short');
  for (const question of questions) assert.ok(safeQuestion(question).numberFields?.length,question.id);
  const angle = questions.find(question=>question.id==='g8_l1_sa_1');
  assert.deepEqual(safeQuestion(angle).numberFields.map(field=>field.unit),['°','′']);
  assert.equal(fraction(angle,['14','49']),1);
  assert.equal(fraction(angle,['14','']),0);
  assert.equal(fraction(angle,'14°49′'),1);
  const percent = midterm.find(question=>question.id==='hk1_9_III_2');
  assert.equal(safeQuestion(percent).numberFields[0].unit,'%');
  assert.equal(fraction(percent,'19,0'),1);
});

test('Học thử, đăng ký, luyện tập, thi thử và chơi theo đội', async t => {
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
  delete process.env.VERCEL;
  if (process.env.ATLAS_TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.ATLAS_TEST_DATABASE_URL;
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(),'atlat-test-'));
  process.env.PORT = '0';
  process.env.HOST = '127.0.0.1';
  process.env.TEACHER_KEY = 'local-test-only';
  const {server} = await import('../server.js');
  if (!server.listening) await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base = 'http://127.0.0.1:'+server.address().port;
  assert.deepEqual(await (await fetch(base+'/api/health')).json(),{ok:true});
  const home = await (await fetch(base+'/')).text();
  assert.match(home,/href="\/ban-do"/);
  assert.doesNotMatch(home,/id="geomap"|id="activity"|id="study-grid"/);
  assert.match(await (await fetch(base+'/ban-do')).text(),/id="geomap"/);
  for (const path of ['/hoc-tap','/phong-hoc?room=123456','/luyen-tap?grade=8','/thi-thu?grade=9','/so-hoc-tap','/tai-khoan']) {
    const response = await fetch(base+path);
    assert.equal(response.status,200,path);
    assert.match(await response.text(),/id="workspace"/,path);
  }
  assert.equal((await fetch(base+'/trang-khong-ton-tai')).status,404);
  function browser() {
    let cookie='';
    return async (path,data,status=200)=>{
      const r=await fetch(base+'/api/'+path,{method:data ? 'POST':'GET',
        headers:{cookie,'Content-Type':'application/json'},body:data ? JSON.stringify(data):undefined});
      const fresh=r.headers.get('set-cookie');
      if(fresh) cookie=fresh.split(';')[0];
      const payload=r.headers.get('content-type').includes('json') ? await r.json() : await r.text();
      assert.equal(r.status,status,path+' '+(payload.error || ''));
      return payload;
    };
  }
  const guest=browser(),teacher=browser(),student=browser(),stranger=browser(),student8=browser();
  const sample=await guest('attempts',{grade:8,mode:'practice'});
  assert.equal(sample.questions.length,3);
  assert.deepEqual(new Set(sample.questions.map(q=>q.type)),new Set(['choice','short','boolean']));
  assert.ok(sample.questions.every(q=>!('answer' in q) && !('explanation' in q)));
  await guest('attempts',{grade:8,mode:'exam'},401);
  await guest('attempts/'+sample.id+'/submit',{answers:{}});
  await stranger('attempts/'+sample.id+'/submit',{answers:{}},404);
  const {user} = await teacher('register',{name:'Giáo viên thử',password:'example123',role:'teacher',teacherKey:process.env.TEACHER_KEY});
  await guest('catalog?grade=8',undefined,401);
  await student('register',{name:'Học sinh thử',password:'example123',role:'student',grade:9,classCode:user.classCode});
  await student8('register',{name:'Học sinh lớp 8',password:'example123',role:'student',grade:8,classCode:user.classCode});
  assert.equal((await student8('me')).user.grade,8);
  await student8('catalog?grade=9',undefined,403);
  await student8('attempts',{grade:9,mode:'practice'},403);
  await student8('student-grade',{grade:9},403);
  const midterm=await student('attempts',{grade:9,mode:'exam',examPaper:'midterm1'});
  assert.equal(midterm.questions[0].id,'hk1_9_I_1');
  assert.ok(midterm.questions.every(q=>!('answer' in q) && !('acceptedAnswers' in q)));
  await student('attempts',{grade:8,mode:'exam',examPaper:'midterm1'},403);
  const test=await student('attempts',{grade:9,mode:'exam'});
  assert.equal(test.questions.length,12);
  const pool=new Map(lessons(9).flatMap(l=>l.questions).map(q=>[q.id,q.answer]));
  const answers=Object.fromEntries(test.questions.map(q=>[q.id,pool.get(q.id)]));
  const marked=await student('attempts/'+test.id+'/submit',{answers});
  assert.equal(marked.score,10);
  assert.deepEqual(marked,await student('attempts/'+test.id+'/submit',{answers:{}}));
  const practice=await student('attempts',{grade:9,lessonId:'g9_l5',mode:'practice'});
  await student('attempts/'+practice.id+'/submit',{answers:{}});
  assert.equal((await student('progress')).recommendation.id,'g9_l5');
  assert.equal((await teacher('progress')).students.find(s=>s.name==='Học sinh thử').attempts,2);
  await student('logout',{});
  await student('login',{name:'Học sinh thử',password:'example123'});
  assert.equal((await student('progress')).attempts.length,2);
  await student('rooms',{grade:8,teamMode:false},403);
  const {code}=await teacher('rooms',{grade:9,teamMode:true});
  const room='rooms/'+code;
  await student8(room,undefined,403);
  assert.match(await teacher('qr?code='+code),/<svg/);
  const {default:atlas} = await import('../api/atlas.js');
  const rewritten = createServer(atlas).listen(0,'127.0.0.1');
  await once(rewritten,'listening');
  try {
    const apiBase = 'http://127.0.0.1:'+rewritten.address().port+'/api/atlas?atlasPath=';
    assert.deepEqual(await (await fetch(apiBase+'health')).json(),{ok:true});
    const invite = await fetch(apiBase+'qr&code='+code);
    assert.equal(invite.status,200);
    assert.match(await invite.text(),/<svg/);
  } finally {
    await new Promise(resolve=>rewritten.close(resolve));
  }
  await guest(room+'/join',{name:'Lan',team:'Sen'});
  assert.equal((await guest(room)).joined,true);
  await guest(room+'/next',{},403);
  await teacher(room+'/next',{});
  const levels=new Set();
  for(let i=0;i<10;i++){
    const {question:q}=await guest(room);
    assert.ok(q && !('answer' in q));
    levels.add(q.level);
    const reply={answer:pool.get(q.id),questionId:q.id};
    await guest(room+'/answer',reply);
    await guest(room+'/answer',reply);
    await teacher(room+'/next',{});
  }
  assert.equal(levels.size,3);
  const final=await teacher(room);
  assert.equal(final.state,'ended');
  assert.equal(final.players[0].score,10);
  assert.ok(final.stats.every(s=>s.right===1 && s.wrong===0 && s.skipped===0));
  assert.equal((await stranger(room)).players.length,0);
  assert.equal(fraction({type:'short',answer:'3.5'},'3,50'),1);
  for(const grade of [8,9]) {
    const catalog=await teacher('catalog?grade='+grade);
    assert.ok(catalog.lessons.every(l=>l.summary && l.count));
    for(const {questions} of lessons(grade)){
      for(const q of questions) {
        assert.equal(fraction(q,q.answer),1,q.id);
        if(q.media) assert.equal((await fetch(base+q.media)).status,200);
      }
    }
  }
});
