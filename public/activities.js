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

function view(title, body, subtitle = '') {
  dialog.innerHTML = `<header class="act-head"><div>${subtitle ? `<small>${esc(subtitle)}</small>` : ''}<h2 id="activity-title" tabindex="-1">${esc(title)}</h2></div><button class="act-close" type="button" aria-label="Đóng cửa sổ">×</button></header>
    <div class="act-body">${body}<p id="act-error" class="act-error" role="alert"></p></div>`;
  dialog.setAttribute('aria-labelledby', 'activity-title');
  dialog.querySelector('.act-close').onclick = () => dialog.close();
  byId('activity-title').focus({preventScroll:true});
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
  view(titles[mode], `<p>${esc(message)}</p>${button('sign-in', 'Đăng nhập hoặc tạo tài khoản')}`);
  action('sign-in', () => { returnTo = [mode, options]; return openActivity('account', options); });
}
function accountPage(register = false) {
  if (user) {
    view(user.name, `<dl class="act-data"><dt>Vai trò</dt><dd>${user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</dd><dt>Mã lớp</dt><dd>${esc(user.classCode || 'Chưa tham gia lớp')}</dd></dl>${user.role === 'student' ? '<form id="class-code" class="act-form"><label>Tham gia lớp bằng mã giáo viên cung cấp<input name="classCode" required maxlength="32"></label><button class="act-btn">Lưu lớp</button></form>' : ''}${button('logout','Đăng xuất',true)}`, 'Tài khoản');
    if (user.role === 'student') submit('class-code', async () => {
      await api('class', Object.fromEntries(new FormData(byId('class-code'))));
      user = (await api('me')).user; accountPage();
    });
    action('logout', async () => {
      await api('logout', {}); user = null; drafts.clear(); returnTo = null;
      window.dispatchEvent(new Event('study:account')); accountPage();
    });
    return;
  }
  view(register ? 'Tạo tài khoản' : 'Đăng nhập', `<form id="credentials" class="act-form">
    <label>Tên đăng nhập<input name="name" autocomplete="username" required maxlength="64"></label>
    <label>Mật khẩu<input name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" ${register ? 'minlength="8"' : ''} required></label>
    ${register ? `<label>Vai trò<select name="role"><option value="student">Học sinh</option><option value="teacher">Giáo viên</option></select></label><label id="class-label">Mã lớp do giáo viên cung cấp (nếu có)<input name="classCode" maxlength="32"></label><label id="teacher-key" hidden>Mã đăng kí dành cho giáo viên<input name="teacherKey" type="password" autocomplete="off" disabled required></label>` : ''}
    <button class="act-btn">${register ? 'Tạo tài khoản' : 'Đăng nhập'}</button></form>
    <button type="button" class="act-link" id="switch-account">${register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng kí'}</button>`);
  const form = byId('credentials');
  if (register) form.elements.role.onchange = () => {
    byId('class-label').hidden = form.elements.role.value === 'teacher';
    form.elements.classCode.disabled = byId('class-label').hidden;
    byId('teacher-key').hidden = form.elements.role.value !== 'teacher';
    form.elements.teacherKey.disabled = byId('teacher-key').hidden;
  };
  action('switch-account', () => accountPage(!register));
  submit('credentials', async () => {
    const token = revision;
    await api(register ? 'register' : 'login', Object.fromEntries(new FormData(form)));
    const result = await api('me');
    if (!current(token)) return;
    user = result.user; window.dispatchEvent(new Event('study:account'));
    if (returnTo) { const next = returnTo; returnTo = null; await openActivity(...next); }
    else accountPage();
  });
}
const draftKey = () => [user?.id || 'guest', mode, options.grade, options.lessonId || ''].join('/');
async function startPage(token) {
  if (mode === 'exam' && !user) return accountGate('Đăng nhập để làm đề thi thử và lưu kết quả.');
  attempt = drafts.get(draftKey());
  if (attempt) return questionPage();
  const {lessons} = await api('catalog?grade=' + enc(options.grade));
  if (!current(token)) return;
  const lesson = lessons.find(l => l.id === options.lessonId);
  const practice = mode === 'practice';
  const picker = practice && !lesson ? `<label>Chủ đề<select id="act-lesson"><option value="">Ôn tập tổng hợp</option>${lessons.map(l => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('')}</select></label>` : '';
  view(lesson?.title || (practice ? 'Luyện tập Địa lí' : 'Thi thử Địa lí'), `
    <p id="lesson-summary">${esc(lesson?.summary || (practice ? 'Ôn lại kiến thức bằng câu hỏi và đối chiếu đáp án sau khi nộp bài.' : 'Đề gồm 8 câu nhiều lựa chọn, 2 câu đúng sai và 2 câu trả lời ngắn trong 45 phút. Ba phần có trọng số 4, 2 và 1, quy đổi về thang 10.'))}</p>
    ${!user ? '<p class="act-note">Lượt học thử gồm ba câu mẫu của khối lớp. Đăng kí để luyện theo từng bài và lưu tiến độ.</p>' : ''}
    <div class="act-form">${user ? picker : ''}${button('begin', practice ? 'Bắt đầu luyện tập' : 'Bắt đầu thi thử')}</div>`, 'Địa lí ' + options.grade);
  const selector = byId('act-lesson');
  if (selector) selector.onchange = () => {
    byId('lesson-summary').textContent = lessons.find(l => l.id === selector.value)?.summary || 'Ôn lại kiến thức bằng câu hỏi và đối chiếu đáp án sau khi nộp bài.';
  };
  action('begin', async () => {
    const lessonId = byId('act-lesson')?.value || options.lessonId;
    const result = await api('attempts', {grade:options.grade, mode, lessonId:lessonId || undefined});
    if (!current(token)) return;
    if (!result.questions?.length) throw new Error('Bài này chưa có câu hỏi.');
    attempt = {...result, index:0, answers:{}};
    drafts.set(draftKey(), attempt); questionPage();
  });
}

function questionMarkup(q, value) {
  const media = q.media?.startsWith('/media/') ? `<img class="act-media" src="${esc(q.media)}" alt="Tư liệu minh họa cho câu hỏi">` : '';
  const lead = `${q.context ? `<div class="act-context">${esc(q.context)}</div>` : ''}${media}<h3>${esc(q.prompt)}</h3>`;
  if (q.type === 'short') return lead + `<label>Câu trả lời<input name="short" maxlength="220" value="${esc(value)}" autocomplete="off"></label>`;
  if (q.type === 'boolean') {
    const statements = q.options?.length ? q.options : ['Nhận định trên'];
    return lead + statements.map((s, i) => `<fieldset class="act-statement"><legend>${esc(s)}</legend>${['Đ','S'].map((v,j) => `<label><input type="radio" name="statement-${i}" value="${v}" ${value?.[i] === v ? 'checked' : ''}>${['Đúng','Sai'][j]}</label>`).join('')}</fieldset>`).join('');
  }
  return lead + (q.options || []).map((s, i) => `<label class="act-option"><input type="radio" name="choice" value="${esc(s)}" ${value === s ? 'checked' : ''}><span>${esc(s)}</span></label>`).join('');
}
function readAnswer(form, q) {
  const data = new FormData(form);
  if (q.type === 'boolean') return Array.from({length:q.options?.length || 1}, (_,i) => data.get('statement-'+i) || '');
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
      const display = a => Array.isArray(a) ? a.map(v => v === 'Đ' ? 'Đúng' : v === 'S' ? 'Sai' : v || '—').join(' · ') : a || '—';
      return `<details class="act-detail"><summary><span>Câu ${i+1}</span><strong>${item.correct ? 'Đúng' : 'Cần ôn lại'}</strong></summary><p>${esc(q?.prompt)}</p><p>Bạn chọn <b>${esc(display(session.answers[item.id]))}</b></p><p>Đáp án <b>${esc(display(item.answer))}</b></p>${item.explanation ? `<p>${esc(item.explanation)}</p>` : ''}</details>`;
    }).join('');
    view('Kết quả bài làm', `<div class="act-score">${formatScore(result.score)} <small>/ ${formatScore(result.total)}</small></div>${rows}<div class="act-actions">${button('continue',user ? 'Xem sổ học tập' : 'Tạo tài khoản')}</div>`, titles[mode] + ' · Lớp ' + options.grade);
    action('continue', () => user ? openActivity('progress',options) : accountPage(true));
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
  if (!user) return accountGate('Đăng nhập để xem các bài đã làm và chủ đề cần ôn tiếp.');
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
  if (rec) action('recommend', () => openActivity('practice',{grade:rec.grade,lessonId:rec.id}));
}

function classroomHome() {
  view('Phòng học', `${user?.role === 'teacher' ? `<h3>Tạo lượt chơi</h3><form id="create-room" class="act-form"><label>Khối lớp<select name="grade"><option value="8">Địa lí 8</option><option value="9" ${options.grade === 9 ? 'selected' : ''}>Địa lí 9</option></select></label>
    <label>Hình thức<select name="teamMode"><option value="false">Cá nhân</option><option value="true">Theo đội</option></select></label><button class="act-btn">Tạo phòng</button></form>` : ''}
    <h3>Tham gia lượt chơi</h3><form id="find-room" class="act-form"><label>Mã phòng<input name="code" maxlength="16" required autocomplete="off"></label><button class="act-btn">Tìm phòng</button></form>
    ${!user ? button('teacher-login','Đăng nhập giáo viên',true) : ''}`);
  if (!user) action('teacher-login', () => { returnTo = ['classroom',options]; return openActivity('account',options); });
  if (user?.role === 'teacher') submit('create-room', async () => {
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
  if (room.host || room.joined || visited.has(code) || room.state === 'ended') return watchRoom(room);
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
  if (!teams) return personal;
  const totals = new Map();
  for (const p of sorted) totals.set(p.team,(totals.get(p.team) || 0)+Number(p.score));
  return table(['Đội','Tổng điểm'],[...totals].sort((a,b) => b[1]-a[1])) + personal;
}
let roomViewKey = '';
function renderRoom(room) {
  const {code,state,host,question:q,teamMode,players,stats} = room;
  const key = [code,state,room.index,room.answered,host].join('/');
  const board = scoreboard(players || [],teamMode);
  if (key === roomViewKey && byId('scoreboard')) {
    if (byId('scoreboard').innerHTML !== board) byId('scoreboard').innerHTML = board;
    return;
  }
  roomViewKey = key;
  const lobby = state === 'lobby', playing = state === 'playing';
  const finalStats = host && state === 'ended' && stats?.length ? `<h3>Kết quả từng câu</h3>${table(['Câu hỏi','Đúng','Sai','Bỏ qua','Tỉ lệ đúng trong số đã trả lời'], stats.map(s => [s.prompt,s.right,s.wrong,s.skipped,(s.right+s.wrong) ? Math.round(100*s.right/(s.right+s.wrong))+'%' : '—']))}` : '';
  view(lobby ? 'Phòng chờ' : playing ? 'Thử thách trên lớp' : 'Kết quả lượt chơi', `
    ${lobby ? `<div class="act-room-code"><span>Mã phòng</span><strong>${esc(code)}</strong></div>${host ? `<figure><img class="act-qr" src="/api/qr?code=${enc(code)}" alt="Mã QR tham gia phòng ${esc(code)}"><figcaption>Quét mã để tham gia trên điện thoại</figcaption></figure>` : '<p>Giáo viên sẽ bắt đầu khi lớp sẵn sàng.</p>'}` : ''}
    ${playing && q ? `<p class="act-meta">Câu ${room.index+1} / ${room.count} · ${esc(q.level)}</p>${host ? `<fieldset class="act-projection" disabled>${questionMarkup(q)}</fieldset>` : room.answered ? '<p role="status">Đã ghi nhận câu trả lời.</p>' : `<form id="room-answer" class="act-form">${questionMarkup(q)}<button class="act-btn">Gửi đáp án</button></form>`}` : ''}
    ${host && state !== 'ended' ? button('room-next',lobby ? 'Bắt đầu lượt chơi' : room.index+1 === room.count ? 'Kết thúc lượt chơi' : 'Chuyển câu tiếp') : ''}
    <h3>${lobby ? 'Người chơi' : 'Bảng điểm'}</h3><div id="scoreboard">${board}</div>${finalStats}`, (teamMode ? 'Theo đội' : 'Cá nhân') + ' · ' + code);
  const token = revision;
  if (byId('room-next')) action('room-next',async () => {
    await api(roomPath(code,'/next'),{index:room.index});
    const updated = await api(roomPath(code));
    if (current(token)) watchRoom(updated);
  });
  if (byId('room-answer')) submit('room-answer',async () => {
    const answer = readAnswer(byId('room-answer'),q);
    if (!complete(answer)) throw new Error('Hãy trả lời đầy đủ trước khi gửi.');
    await api(roomPath(code,'/answer'),{answer,questionId:q.id});
    const updated = await api(roomPath(code));
    if (current(token)) watchRoom(updated);
  });
}
let pollId = 0;
function watchRoom(room) {
  clearTimeout(timer);
  const token = revision, id = ++pollId;
  renderRoom(room);
  if (room.state === 'ended') return;
  const poll = async () => {
    try {
      const updated = await api(roomPath(room.code));
      if (current(token) && id === pollId) watchRoom(updated);
    } catch (e) {
      if (current(token) && id === pollId) { error(e.message); timer = setTimeout(poll,3000); }
    }
  };
  timer = setTimeout(poll,1400);
}
async function openActivity(nextMode, args = {}) {
  if (!titles[nextMode]) return;
  const token = ++revision;
  clearInterval(timer); roomViewKey = ''; mode = nextMode;
  options = {...args,grade:Number(args.grade) === 9 ? 9 : 8};
  if (!dialog.open) dialog.showModal();
  view(titles[mode],'<p role="status">Đang tải…</p>');
  try {
    const result = await api('me');
    if (!current(token)) return;
    user = result.user;
    if (mode === 'account') accountPage();
    if (mode === 'practice' || mode === 'exam') await startPage(token);
    if (mode === 'progress') await progressPage(token);
    if (mode === 'classroom') {
      if (options.code) await enterRoom(options.code); else classroomHome();
    }
  } catch (e) { if (current(token)) error(e.message); }
}
dialog.addEventListener('close', () => {
  clearInterval(timer); revision++; returnTo = null;
});
window.study = {open:openActivity};
const invited = new URL(location.href).searchParams.get('room');
if (invited) openActivity('classroom',{code:invited.trim().toUpperCase()});
