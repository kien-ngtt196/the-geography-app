import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { lessons, fraction } from '../learning.js';

test('Học thử, đăng ký, luyện tập, thi thử và chơi theo đội', async t => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(),'atlat-test-'));
  process.env.PORT = '0';
  process.env.HOST = '127.0.0.1';
  process.env.TEACHER_KEY = 'local-test-only';
  const {server} = await import('../server.js');
  if (!server.listening) await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base = 'http://127.0.0.1:'+server.address().port;
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
  const guest=browser(),teacher=browser(),student=browser(),stranger=browser();
  const sample=await guest('attempts',{grade:8,mode:'practice'});
  assert.equal(sample.questions.length,3);
  assert.deepEqual(new Set(sample.questions.map(q=>q.type)),new Set(['choice','short','boolean']));
  assert.ok(sample.questions.every(q=>!('answer' in q) && !('explanation' in q)));
  await guest('attempts',{grade:8,mode:'exam'},401);
  await guest('attempts/'+sample.id+'/submit',{answers:{}});
  await stranger('attempts/'+sample.id+'/submit',{answers:{}},404);
  const {user} = await teacher('register',{name:'Giáo viên thử',password:'example123',role:'teacher',teacherKey:process.env.TEACHER_KEY});
  await student('register',{name:'Học sinh thử',password:'example123',role:'student',classCode:user.classCode});
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
  assert.equal((await teacher('progress')).students[0].attempts,2);
  await student('logout',{});
  await student('login',{name:'Học sinh thử',password:'example123'});
  assert.equal((await student('progress')).attempts.length,2);
  await student('rooms',{grade:8,teamMode:false},403);
  const {code}=await teacher('rooms',{grade:9,teamMode:true});
  const room='rooms/'+code;
  assert.match(await teacher('qr?code='+code),/<svg/);
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
    const catalog=await guest('catalog?grade='+grade);
    assert.ok(catalog.lessons.every(l=>l.summary && l.count));
    for(const {questions} of lessons(grade)){
      for(const q of questions) {
        assert.equal(fraction(q,q.answer),1,q.id);
        if(q.media) assert.equal((await fetch(base+q.media)).status,200);
      }
    }
  }
});
