const dialog = document.getElementById('activity');
const styles = document.createElement('link');
styles.rel = 'stylesheet';
styles.href = '/activities.css';
document.head.append(styles);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const titles = {
  practice: 'Luyện tập', exam: 'Thi thử', progress: 'Sổ học tập',
  classroom: 'Phòng học', account: 'Tài khoản'
};
const activityStickers = {practice:'book',exam:'compass',progress:'photos',classroom:'mountains',account:'globe'};
const formatScore = value => Number(value).toLocaleString('vi-VN', {maximumFractionDigits: 2});
let user, mode, options, attempt, timer, revision = 0, returnTo;
const drafts = new Map();
const byId = id => dialog.querySelector('#' + id);
const enc = encodeURIComponent;
const esc = escapeHtml;

async function api(path, data) {
  const response = await fetch('/api/' + path, data === undefined ? {cache:'no-store'} : {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Yêu cầu chưa thành công. Hãy thử lại.'),{status:response.status});
  return result;
}
export async function signInGuest() {
  const result = await api('guest-login',{});
  window.dispatchEvent(new Event('study:account'));
  return result;
}

function view(title, body, subtitle = '') {
  dialog.innerHTML = `<header class="act-head"><div>${subtitle ? `<small>${esc(subtitle)}</small>` : ''}<h1 id="activity-title" tabindex="-1">${esc(title)}</h1></div>
    <span class="feature-sticker" data-sticker="${activityStickers[mode]}" aria-hidden="true"></span></header>
    <div class="act-body">${body}<p id="act-error" class="act-error" role="alert"></p></div>`;
  dialog.setAttribute('aria-labelledby', 'activity-title');
  byId('activity-title').focus();
}
function error(message) {
  const target = byId('act-error');
  if (target) target.textContent = message;
}
function current(token) { return dialog.open && token === revision; }
function perform(callback) {
  return async event => {
    event.preventDefault();
    const control = event.submitter || event.currentTarget;
    const token = revision;
    control.disabled = true;
    error('');
    try { await callback(event); }
    catch (e) { if (current(token)) error(e.message); }
    finally { control.disabled = false; }
  };
}
function action(id, callback) { byId(id).onclick = perform(callback); }
function submit(id, callback) { byId(id).onsubmit = perform(callback); }
function button(id, label, secondary = false) {
  return `<button type="button" class="act-btn${secondary ? ' act-secondary' : ''}" id="${id}">${esc(label)}</button>`;
}
function accountGate(message) {
  view(titles[mode], `<p>${esc(message)}</p><div class="act-actions">${button('sign-in','Đăng nhập hoặc tạo tài khoản')}${button('guest-login','Dùng thử với tư cách khách',true)}</div>`);
  action('sign-in', () => { returnTo = [mode, options]; return openActivity('account', options); });
  action('guest-login', async () => { await signInGuest(); await openActivity(mode,options); });
}
function accountPage(register = false) {
  if (user) {
    if (user.role === 'guest') {
      view('Phiên khách','<p>Phiên dùng thử cho phép mở học liệu của cả hai khối và tạo phòng chơi thử. Lịch sử học của phiên được lưu trên tài khoản khách trong 24 giờ.</p><div class="act-actions"><a class="act-btn" href="/hoc-tap">Vào Góc học tập</a>'+button('logout','Kết thúc phiên khách',true)+'</div>','Tài khoản');
      action('logout', logout);
      return;
    }
    const role = user.role === 'teacher' ? 'Giáo viên' : user.grade ? 'Học sinh lớp ' + user.grade : 'Học sinh';
    const gradeForm = user.role === 'student' && !user.grade ? '<form id="set-grade" class="act-form"><label>Khối lớp<select name="grade"><option value="8">Lớp 8</option><option value="9">Lớp 9</option></select></label><button class="act-btn">Lưu khối lớp</button></form>' : '';
    view(user.name, `<dl class="act-data"><dt>Vai trò</dt><dd>${role}</dd><dt>Mã lớp</dt><dd>${esc(user.classCode || 'Chưa tham gia lớp')}</dd></dl>${gradeForm}${user.role === 'student' ? '<form id="class-code" class="act-form"><label>Tham gia lớp bằng mã giáo viên cung cấp<input name="classCode" required maxlength="32"></label><button class="act-btn">Lưu lớp</button></form>' : ''}${button('logout','Đăng xuất',true)}`, 'Tài khoản');
    if (gradeForm) submit('set-grade', async () => {
      const result = await api('student-grade', Object.fromEntries(new FormData(byId('set-grade'))));
      user = result.user;
      window.dispatchEvent(new Event('study:account'));
      if (returnTo) { const next = returnTo; returnTo = null; await openActivity(...next); }
      else location.assign('/hoc-tap');
    });
    if (user.role === 'student') submit('class-code', async () => {
      await api('class', Object.fromEntries(new FormData(byId('class-code'))));
      user = (await api('me')).user; accountPage();
    });
    action('logout', logout);
    return;
  }
  view(register ? 'Tạo tài khoản' : 'Đăng nhập', `<form id="credentials" class="act-form">
    <label>Tên đăng nhập<input name="name" autocomplete="username" required maxlength="64"></label>
    <label>Mật khẩu<input name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" ${register ? 'minlength="8"' : ''} required></label>
    ${register ? `<label>Vai trò<select name="role"><option value="student">Học sinh</option><option value="teacher">Giáo viên</option></select></label><label id="grade-label">Khối lớp<select name="grade" required><option value="">Chọn khối lớp</option><option value="8">Lớp 8</option><option value="9">Lớp 9</option></select></label><label id="class-label">Mã lớp do giáo viên cung cấp (nếu có)<input name="classCode" maxlength="32"></label><label id="teacher-key" hidden>Mã đăng kí dành cho giáo viên<input name="teacherKey" type="password" autocomplete="off" disabled required></label>` : ''}
    <button class="act-btn">${register ? 'Tạo tài khoản' : 'Đăng nhập'}</button></form>
    <div class="act-actions"><button type="button" class="act-link" id="switch-account">${register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng kí'}</button>
    ${button('guest-login','Dùng thử với tư cách khách',true)}</div>`);
  const form = byId('credentials');
  if (register) form.elements.role.onchange = () => {
    byId('class-label').hidden = form.elements.role.value === 'teacher';
    byId('grade-label').hidden = byId('class-label').hidden;
    form.elements.grade.disabled = byId('grade-label').hidden;
    form.elements.classCode.disabled = byId('class-label').hidden;
    byId('teacher-key').hidden = form.elements.role.value !== 'teacher';
    form.elements.teacherKey.disabled = byId('teacher-key').hidden;
  };
  action('switch-account', () => accountPage(!register));
  async function resumeAccount(result,token) {
    if (!current(token)) return;
    user = result.user;
    if (user.role !== 'guest') window.dispatchEvent(new Event('study:account'));
    if (returnTo) { const next = returnTo; returnTo = null; await openActivity(...next); }
    else location.assign('/hoc-tap');
  }
  action('guest-login',async () => {
    const token = revision;
    await resumeAccount(await signInGuest(),token);
  });
  submit('credentials', async () => {
    const token = revision;
    const result = await api(register ? 'register' : 'login', Object.fromEntries(new FormData(form)));
    await resumeAccount(result,token);
  });
}
async function logout() {
  await api('logout', {});
  user = null;
  drafts.clear();
  returnTo = null;
  window.dispatchEvent(new Event('study:account'));
  accountPage();
}
const draftKey = () => [user?.id || 'guest', mode, options.grade, options.lessonId || ''].join('/');
async function startPage(token) {
  if (!user) return accountGate('Đăng nhập hoặc dùng thử với tư cách khách để mở học liệu.');
  attempt = drafts.get(draftKey());
  if (attempt) return questionPage();
  const {lessons} = await api('catalog?grade=' + enc(options.grade));
  if (!current(token)) return;
  const lesson = lessons.find(l => l.id === options.lessonId);
  const practice = mode === 'practice';
  const picker = practice && !lesson ? `<label>Chủ đề<select id="act-lesson"><option value="">Ôn tập tổng hợp</option>${lessons.map(l => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('')}</select></label>` : '';
  const examPicker = !practice && options.grade === 9 ? '<label>Chọn đề<select id="act-paper"><option value="midterm1">Giữa kì I · Theo đề mẫu của trường</option><option value="general">Ôn tập tổng hợp cả năm</option></select></label>' : '';
  const midtermScope = 'Ôn phần trắc nghiệm về dân cư, lao động và nông nghiệp trong đề giữa kì I lớp 9 của Trường THCS Nguyễn Du. Đề gốc dành 3 điểm cho phần tự luận.';
  const generalScope = 'Câu hỏi được chọn ngẫu nhiên từ các bài trong cả năm học của lớp ' + options.grade + '.';
  view(lesson?.title || (practice ? 'Luyện tập Địa lí' : 'Thi thử Địa lí'), `
    ${examPicker ? '<div class="act-form">'+examPicker+'</div>' : ''}
    <p id="lesson-summary">${esc(lesson?.summary || (practice ? 'Ôn lại kiến thức bằng câu hỏi và đối chiếu đáp án sau khi nộp bài.' : examPicker ? midtermScope : generalScope))}</p>
    ${practice ? '' : '<p>45 phút · 8 câu nhiều lựa chọn, 2 câu đúng sai (mỗi câu 4 ý) và 2 câu trả lời ngắn. Phần trắc nghiệm có 7 điểm, quy đổi sang thang 10 để lưu vào sổ học tập.</p>'}
    <div class="act-form">${picker}${button('begin', practice ? 'Bắt đầu luyện tập' : 'Bắt đầu thi thử')}</div>`, 'Địa lí ' + options.grade);
  const selector = byId('act-lesson');
  const paperSelector = byId('act-paper');
  if (paperSelector) paperSelector.onchange = () => {
    byId('lesson-summary').textContent = paperSelector.value === 'midterm1' ? midtermScope : generalScope;
  };
  if (selector) selector.onchange = () => {
    byId('lesson-summary').textContent = lessons.find(l => l.id === selector.value)?.summary || 'Ôn lại kiến thức bằng câu hỏi và đối chiếu đáp án sau khi nộp bài.';
  };
  action('begin', async () => {
    const lessonId = byId('act-lesson')?.value || options.lessonId;
    const result = await api('attempts', {grade:options.grade, mode, lessonId:lessonId || undefined, examPaper:paperSelector?.value});
    if (!current(token)) return;
    if (!result.questions?.length) throw new Error('Bài này chưa có câu hỏi.');
    attempt = {...result, index:0, answers:{}};
    drafts.set(draftKey(), attempt); questionPage();
  });
}

function questionMarkup(q, value, projection = false) {
  const media = q.media?.startsWith('/media/') ? `<img class="act-media" src="${esc(q.media)}" alt="Tư liệu minh họa cho câu hỏi">` : '';
  const lead = `${q.context ? `<div class="act-context">${esc(q.context)}</div>` : ''}${q.table?.length ? table(q.table[0],q.table.slice(1)) : ''}${media}<h3>${esc(q.prompt)}</h3>`;
  if (q.type === 'short') {
    return lead + shortFields(q,value);
  }
  if (q.type === 'boolean') {
    const statements = q.options?.length ? q.options : ['Nhận định trên'];
    return lead + statements.map((s, i) => `<fieldset class="act-statement"><legend>${esc(s)}</legend>${['Đ','S'].map((v,j) => `<label><input type="radio" name="statement-${i}" value="${v}" ${value?.[i] === v ? 'checked' : ''}>${['Đúng','Sai'][j]}</label>`).join('')}</fieldset>`).join('');
  }
  if (projection) return lead + `<ol class="act-room-choices">${q.options.map((option,i) => `<li class="act-room-choice act-room-choice-${i}">${esc(option)}</li>`).join('')}</ol>`;
  return lead + (q.options || []).map((s, i) => `<label class="act-option"><input type="radio" name="choice" value="${esc(s)}" ${value === s ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('');
}
function shortFields(q, value) {
  if (!q.numberFields) return `<label>Câu trả lời<input name="short" maxlength="220" value="${esc(value)}" autocomplete="off"></label>`;
  const fields = q.numberFields.map(({label,unit}, i) => {
    const fieldValue = q.numberFields.length === 1 ? value : value?.[i];
    const fieldLabel = label || (q.numberFields.length === 1 ? 'Đáp án' : `Ô ${i+1}`);
    return `<label>${esc(fieldLabel)}<span class="act-number"><input name="number-${i}" inputmode="${q.numberFields.length === 1 ? 'decimal' : 'numeric'}" maxlength="32" value="${esc(fieldValue)}" autocomplete="off" ${unit ? `aria-describedby="unit-${i}"` : ''}>${unit ? `<span id="unit-${i}">${esc(unit)}</span>` : ''}</span></label>`;
  });
  return `<div class="act-numbers">${fields.join('')}</div>`;
}
function readAnswer(form, q) {
  const data = new FormData(form);
  if (q.type === 'boolean') return Array.from({length:q.statementCount || q.options?.length || 1}, (_,i) => data.get('statement-'+i) || '');
  if (q.type === 'short' && q.numberFields) {
    const parts = q.numberFields.map((_,i) => String(data.get('number-'+i) || '').trim());
    if (q.numberFields.length === 1) return parts[0];
    return parts;
  }
  return String(data.get(q.type) || '').trim();
}
function complete(value) { return Array.isArray(value) ? value.every(Boolean) : !!value; }
function expires(value) { return typeof value === 'number' ? value * (value < 1e12 ? 1000 : 1) : Date.parse(value); }
async function finishAttempt() {
  if (attempt.submitting) return;
  const token = revision, session = attempt, key = draftKey();
  session.submitting = true;
  try {
    const result = await api('attempts/' + enc(session.id) + '/submit', {answers:session.answers});
    drafts.delete(key);
    if (!current(token)) return;
    clearInterval(timer);
    const rows = result.items.map((item, i) => {
      const q = session.questions.find(x => x.id === item.id);
      const display = a => {
        if (q?.numberFields?.length > 1 && Array.isArray(a)) {
          return a.map((value,index)=> value ? value + q.numberFields[index].unit : '—').join(' ');
        }
        if (q?.numberFields?.length === 1 && a) return [a,q.numberFields[0].unit].filter(Boolean).join(' ');
        return Array.isArray(a) ? a.map(v => v === 'Đ' ? 'Đúng' : v === 'S' ? 'Sai' : v || '—').join(' · ') : a || '—';
      };
      return `<details class="act-detail"><summary><span>Câu ${i+1}</span><strong>${item.correct ? 'Đúng' : 'Cần ôn lại'}</strong></summary><p>${esc(q?.prompt)}</p><p>Bạn chọn <b>${esc(display(session.answers[item.id]))}</b></p><p>Đáp án <b>${esc(display(item.answer))}</b></p>${item.explanation ? `<p>${esc(item.explanation)}</p>` : ''}${q?.source ? `<small>${esc(q.source)}</small>` : ''}</details>`;
    }).join('');
    const objective = result.objectiveScore === undefined ? '' : `<p>Phần trắc nghiệm đạt <b>${formatScore(result.objectiveScore)} / 7</b> điểm. Điểm quy đổi trong sổ học tập:</p>`;
    view('Kết quả bài làm', `${objective}<div class="act-score">${formatScore(result.score)} <small>/ ${formatScore(result.total)}</small></div>${rows}<div class="act-actions">${button('continue',user ? 'Xem sổ học tập' : 'Tạo tài khoản')}</div>`, titles[mode] + ' · Lớp ' + options.grade);
    action('continue', () => user ? location.assign('/so-hoc-tap') : accountPage(true));
  } catch (e) {
    if (e.status === 409 && session.expiresAt && Date.now() > session.expiresAt) {
      drafts.delete(key);
      if (current(token)) {
        clearInterval(timer);
        view('Đã hết thời gian nộp bài', '<p>Lượt thi đã đóng. Bạn có thể bắt đầu một đề mới.</p>'+button('restart','Chọn đề mới'));
        action('restart',()=>openActivity('exam',options));
      }
    } else throw e;
  } finally { session.submitting = false; }
}
function questionPage() {
  clearInterval(timer);
  const {index,questions,answers} = attempt, q = questions[index];
  view(titles[mode], `<div class="act-meta"><b>Câu ${index+1} / ${questions.length}</b><span>${esc(q.level)}</span><time id="exam-timer"></time></div>
    <progress value="${index+1}" max="${questions.length}"></progress>
    <form class="act-form" id="question">${questionMarkup(q,answers[q.id])}
    <div class="act-actions">${index ? button('previous','Câu trước',true) : ''}<button class="act-btn">${index === questions.length-1 ? 'Kiểm tra và nộp' : 'Câu tiếp'}</button></div></form>`, 'Địa lí ' + options.grade);
  const form = byId('question');
  form.oninput = () => { answers[q.id] = readAnswer(form,q); };
  if (index) action('previous', () => { attempt.index--; questionPage(); });
  submit('question', () => {
    answers[q.id] = readAnswer(form,q);
    if (index+1 < questions.length) { attempt.index++; questionPage(); return; }
    const missing = questions.filter(it => !complete(answers[it.id])).length;
    view('Nộp bài làm?', `<p>${missing ? `Còn ${missing} câu chưa trả lời đầy đủ.` : 'Bạn đã trả lời tất cả câu hỏi.'}</p><div class="act-actions">${button('review','Xem lại',true)}${button('finish','Nộp bài')}</div><time id="exam-timer"></time>`);
    action('review', () => { attempt.index = Math.max(0,questions.findIndex(it => !complete(answers[it.id]))); questionPage(); });
    action('finish',finishAttempt);
  });
  if (attempt.expiresAt) {
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((expires(attempt.expiresAt)-Date.now())/1000));
      const clock = byId('exam-timer');
      if (clock) clock.textContent = Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
      if (seconds === 0) { clearInterval(timer); finishAttempt().catch(e => error(e.message)); }
    };
    timer = setInterval(tick,1000); tick();
  }
}

function table(headers, rows) {
  return `<div class="act-scroll"><table><thead><tr>${headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
async function progressPage(token) {
  if (!user) return accountGate('Đăng nhập hoặc dùng thử với tư cách khách để xem Sổ học tập.');
  const result = await api('progress');
  if (!current(token)) return;
  const rec = result.recommendation;
  const date = value => {
    const d = new Date(typeof value === 'number' ? expires(value) : value);
    return isNaN(d) ? '' : d.toLocaleDateString('vi-VN');
  };
  const students = result.students || [];
  view('Sổ học tập', `${user.role === 'teacher' ? `<h3>Kết quả lớp ${esc(user.classCode)}</h3>${students.length ? table(['Học sinh','Bài đã làm','Tổng điểm','Bài gần nhất','Ngày'],students.map(s => [s.name,s.attempts,formatScore(s.score)+' / '+formatScore(s.total),s.lastLesson || '—',s.lastDate ? date(s.lastDate) : '—'])) : '<p>Chưa có kết quả từ học sinh trong lớp. Học sinh có thể nhập mã lớp trong tài khoản.</p>'}` : ''}
    ${rec ? `<div class="act-note"><small>Gợi ý ôn tập · Lớp ${esc(rec.grade)}</small><h3>${esc(rec.title)}</h3>${button('recommend','Ôn bài này')}</div>` : ''}
    <h3>Bài đã làm</h3>${result.attempts.length ? table(['Ngày','Hoạt động','Điểm'],result.attempts.map(a => [date(a.date),(a.lesson || titles[a.mode])+' · Lớp '+a.grade,formatScore(a.score)+' / '+formatScore(a.total)])) : '<p>Bài đã nộp sẽ xuất hiện tại đây.</p>'}`, user.name);
  if (rec) action('recommend', () => location.assign('/luyen-tap?grade='+enc(rec.grade)+'&lesson='+enc(rec.id)));
}

function classroomHome() {
  const canHost = ['teacher','guest'].includes(user?.role);
  const demo = user?.role === 'guest';
  view('Phòng học', `${canHost ? `<h3>${demo ? 'Tạo lượt chơi thử' : 'Tạo lượt chơi'}</h3>${demo ? '<p>Mở mã QR bằng điện thoại hoặc cửa sổ ẩn danh để thử giao diện người chơi.</p>' : ''}<form id="create-room" class="act-form"><label>Khối lớp<select name="grade"><option value="8">Địa lí 8</option><option value="9" ${options.grade === 9 ? 'selected' : ''}>Địa lí 9</option></select></label>
    <label>Hình thức<select name="teamMode"><option value="false">Cá nhân</option><option value="true">Theo đội</option></select></label><button class="act-btn">${demo ? 'Tạo phòng thử' : 'Tạo phòng'}</button></form>` : ''}
    <h3>Tham gia lượt chơi</h3><p>Quét mã QR trên màn hình giáo viên hoặc nhập mã phòng bên dưới.</p><form id="find-room" class="act-form"><label>Mã phòng<input name="code" maxlength="16" required autocomplete="off"></label><button class="act-btn">Tìm phòng</button></form>
    ${!user ? `<div class="act-actions">${button('teacher-login','Đăng nhập giáo viên',true)}${button('guest-login','Dùng thử với tư cách khách',true)}</div>` : ''}`);
  if (!user) {
    action('teacher-login', () => { returnTo = ['classroom',options]; return openActivity('account',options); });
    action('guest-login', async () => { await signInGuest(); await openActivity('classroom',options); });
  }
  if (canHost) submit('create-room', async () => {
    const data = new FormData(byId('create-room')), token = revision;
    const result = await api('rooms',{grade:Number(data.get('grade')),teamMode:data.get('teamMode') === 'true'});
    if (current(token)) await enterRoom(result.code);
  });
  submit('find-room', () => enterRoom(new FormData(byId('find-room')).get('code').trim().toUpperCase()));
}

const roomPath = (code, suffix='') => 'rooms/' + enc(code) + suffix;
const visited = new Set();
async function enterRoom(code) {
  const token = revision;
  const room = await api(roomPath(code));
  if (!current(token)) return;
  if (room.host || room.joined || visited.has(code) || room.state === 'ended') {
    if (location.pathname === '/phong-hoc' && new URLSearchParams(location.search).get('room') !== code) {
      history.replaceState(history.state,'','/phong-hoc?room='+enc(code));
    }
    return watchRoom(room);
  }
  view('Tham gia phòng ' + code, `<form id="join-room" class="act-form"><label>Tên hiển thị<input name="name" required maxlength="40" value="${esc(user?.name)}"></label>
    ${room.teamMode ? '<label>Tên đội<input name="team" required maxlength="32" placeholder="Nhập cùng tên với đồng đội"></label>' : ''}<button class="act-btn">Vào phòng</button></form>`);
  submit('join-room', async () => {
    await api(roomPath(code,'/join'), Object.fromEntries(new FormData(byId('join-room'))));
    visited.add(code);
    if (current(token)) await enterRoom(code);
  });
}
function scoreboard(players, teams) {
  if (!players.length) return '<p>Đang chờ người chơi tham gia…</p>';
  const sorted = [...players].sort((a,b) => b.score-a.score);
  const personal = table(['Người chơi',...(teams ? ['Đội'] : []),'Điểm'], sorted.map(p => [p.name,...(teams ? [p.team] : []),p.score]));
  return (teams ? teamStandings(sorted) : '') + personal;
}
function teamStandings(players) {
  const totals = new Map();
  for (const p of players) totals.set(p.team,(totals.get(p.team) || 0)+Number(p.score));
  return table(['Đội','Tổng điểm'],[...totals].sort((a,b) => b[1]-a[1]).map(([team,score]) => [team,formatScore(score)]));
}
function roomResults(players, teams) {
  if (!players.length) return '<p>Chưa có kết quả người chơi.</p>';
  const ranked = [...players].sort((a,b) => b.score-a.score || a.name.localeCompare(b.name,'vi'));
  const podium = ranked.slice(0,3).map(({name,team,score},i) => `<li class="act-podium-place" data-rank="${i+1}">
    <span class="act-podium-name">${esc(name)}</span>
    ${teams ? `<span class="act-podium-team">${esc(team)}</span>` : ''}
    <div class="act-podium-step">${i === 0 ? '<span class="act-podium-crown" aria-hidden="true"></span>' : ''}
      <span class="act-podium-rank" aria-label="Hạng ${i+1}">${i+1}</span><span class="act-podium-score">${formatScore(score)} điểm</span>
    </div>
  </li>`).join('');
  const fireworks = '<div class="act-podium-fireworks" aria-hidden="true">' + Array.from({length:4}, () =>
    '<span class="act-podium-firework">' + Array.from({length:8}, (_,i) => `<i style="--ray:${i*45}deg"></i>`).join('') + '</span>').join('') + '</div>';
  const runners = ranked.slice(3,10).map((p,i) => [i+4,p.name,...(teams ? [p.team] : []),formatScore(p.score)]);
  return `<section class="act-standings" aria-labelledby="standings-title"><div class="act-podium">
    ${fireworks}<h2 id="standings-title">Bảng xếp hạng</h2><ol class="act-podium-list">${podium}</ol></div>
    ${runners.length ? `<div class="act-standings-runners">${table(['Hạng','Người chơi',...(teams ? ['Đội'] : []),'Điểm'],runners)}</div>` : ''}
  </section>${teams ? `<h3>Xếp hạng theo đội</h3>${teamStandings(ranked)}` : ''}`;
}
function roomAnswerForm(q) {
  if (q.type === 'choice') {
    const choices = Array.from({length:q.optionCount}, (_,i) =>
      `<button class="act-room-choice act-room-choice-${i}" name="choice" value="${i}">${'ABCD'[i]}</button>`);
    return `<form id="room-answer"><fieldset id="room-controls" class="act-room-choices" aria-label="Chọn đáp án">${choices.join('')}</fieldset></form>`;
  }
  const fields = q.type === 'short' ? shortFields(q) : Array.from({length:q.statementCount}, (_,i) =>
    `<fieldset class="act-statement"><legend>Ý ${'abcd'[i]}</legend><label><input type="radio" name="statement-${i}" value="Đ" required>Đúng</label><label><input type="radio" name="statement-${i}" value="S" required>Sai</label></fieldset>`).join('');
  return `<form id="room-answer"><fieldset id="room-controls" class="act-form act-room-fields" aria-label="Nhập đáp án">${fields}<button class="act-btn">Gửi đáp án</button></fieldset></form>`;
}
let roomViewKey = '', roomSnapshot, roomClock;
function renderRoom(room) {
  const {code,state,host,question:q,teamMode,players,stats} = room;
  const key = [code,state,room.index,room.answered,host].join('/');
  const board = state === 'ended' ? '' : scoreboard(players || [],teamMode);
  if (key === roomViewKey) {
    const scoreboardNode = byId('scoreboard');
    if (scoreboardNode && scoreboardNode.innerHTML !== board) scoreboardNode.innerHTML = board;
    return;
  }
  roomViewKey = key;
  const lobby = state === 'lobby', playing = state === 'playing';
  const finalStats = host && state === 'ended' && stats?.length ? `<h3>Kết quả từng câu</h3>${table(['Câu hỏi','Đúng','Sai','Bỏ qua','Tỉ lệ đúng trong số đã trả lời'], stats.map(s => [s.prompt,s.right,s.wrong,s.skipped,(s.right+s.wrong) ? Math.round(100*s.right/(s.right+s.wrong))+'%' : '—']))}` : '';
  view(lobby ? 'Phòng chờ' : playing ? 'Thử thách trên lớp' : 'Kết quả lượt chơi', `
    ${lobby ? `<div class="act-room-invite">
      <div class="act-room-code"><span>Mã phòng</span><strong>${esc(code)}</strong></div>
      ${host ? `<figure class="act-room-qr"><img class="act-qr" src="/api/qr?code=${enc(code)}" width="240" height="240" alt="Mã QR tham gia phòng ${esc(code)}"><figcaption>Quét mã QR bằng điện thoại, rồi nhập tên để vào phòng.</figcaption></figure>` : '<p>Giáo viên sẽ bắt đầu khi lớp sẵn sàng.</p>'}
    </div>` : ''}
    ${playing && q ? `<div class="act-room-timing"><span>Câu ${room.index+1} / ${room.count}${host ? ' · '+esc(q.level) : ''}</span><span id="room-seconds" role="timer" aria-label="Thời gian còn lại"></span><progress id="room-progress" aria-label="Thời gian còn lại" max="${room.durationMs}"></progress></div>${host ? `<fieldset class="act-projection" disabled>${questionMarkup(q,undefined,true)}</fieldset>` : room.answered ? `<p role="status">Đã ghi nhận câu trả lời · <strong>+${formatScore(room.points)} điểm</strong></p>` : roomAnswerForm(q)}` : ''}
    ${host && state !== 'ended' ? button('room-next',lobby ? 'Bắt đầu lượt chơi' : room.index+1 === room.count ? 'Kết thúc sớm' : 'Chuyển câu sớm') : ''}
    ${state === 'ended' ? roomResults(players || [],teamMode) : host || lobby ? `<h3>${lobby ? 'Người chơi' : 'Bảng điểm'}</h3><div id="scoreboard">${board}</div>` : ''}${finalStats}`, (teamMode ? 'Theo đội' : 'Cá nhân') + ' · ' + code);
  const token = revision;
  if (byId('room-next')) action('room-next',async () => {
    await api(roomPath(code,'/next'),{index:room.index});
    const updated = await api(roomPath(code));
    if (current(token)) watchRoom(updated);
  });
  if (byId('room-answer')) submit('room-answer',async event => {
    const controls = byId('room-controls');
    const answer = q.type === 'choice' ? Number(event.submitter.value) : readAnswer(byId('room-answer'),q);
    if (q.type !== 'choice' && !complete(answer)) throw new Error('Hãy trả lời đầy đủ trước khi gửi.');
    controls.dataset.sending = 'true';
    controls.disabled = true;
    try {
      await api(roomPath(code,'/answer'),{answer,questionId:q.id});
      const updated = await api(roomPath(code));
      if (current(token)) watchRoom(updated);
    } finally {
      delete controls.dataset.sending;
      controls.disabled = byId('room-progress')?.value === 0;
    }
  });
}
let pollId = 0;
function watchRoom(room) {
  if (roomSnapshot?.code === room.code && (room.index < roomSnapshot.index ||
      (room.index === roomSnapshot.index && roomSnapshot.answered && !room.answered))) return;
  roomSnapshot = room;
  clearTimeout(timer);
  clearInterval(roomClock);
  const token = revision, id = ++pollId;
  renderRoom(room);
  if (room.state === 'ended') return;
  if (room.state === 'playing') {
    const localDeadline = performance.now() + room.remainingMs;
    const updateClock = () => {
      const remaining = Math.max(0,localDeadline - performance.now());
      const seconds = byId('room-seconds'), progress = byId('room-progress');
      seconds.textContent = `${Math.ceil(remaining / 1000)} giây`;
      progress.value = remaining;
      progress.classList.toggle('is-urgent', remaining <= 5000);
      const controls = byId('room-controls');
      if (controls && !controls.dataset.sending) controls.disabled = remaining === 0;
    };
    updateClock();
    roomClock = setInterval(updateClock,125);
  }
  const poll = async () => {
    try {
      const updated = await api(roomPath(room.code));
      if (current(token) && id === pollId) watchRoom(updated);
    } catch (e) {
      if (current(token) && id === pollId) { error(e.message); timer = setTimeout(poll,3000); }
    }
  };
  timer = setTimeout(poll,room.state === 'playing' ? Math.max(200,Math.min(room.remainingMs,1000)) : 1400);
}
export async function openActivity(nextMode, args = {}) {
  if (!titles[nextMode]) return;
  const token = ++revision;
  clearInterval(timer); clearInterval(roomClock); roomViewKey = ''; roomSnapshot = undefined; mode = nextMode;
  const requestedGrade = Number(args.grade);
  options = {...args,grade:[8,9].includes(requestedGrade) ? requestedGrade : undefined};
  if (!dialog.open) dialog.show();
  view(titles[mode],'<p role="status">Đang tải…</p>');
  try {
    const result = await api('me');
    if (!current(token)) return;
    user = result.user;
    options.grade ??= user?.grade || 8;
    if (mode === 'account') accountPage();
    if (mode === 'practice' || mode === 'exam') await startPage(token);
    if (mode === 'progress') await progressPage(token);
    if (mode === 'classroom') {
      if (options.code) await enterRoom(options.code); else classroomHome();
    }
  } catch (e) { if (current(token)) error(e.message); }
}
dialog.addEventListener('close', () => {
  clearInterval(timer); clearInterval(roomClock); revision++; returnTo = null;
});
