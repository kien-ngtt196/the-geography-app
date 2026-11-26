import { pages } from './routes.js';
import { openActivity, signInGuest } from './activities.js';

const url = new URL(location.href);
const path = url.pathname.replace(/\/$/,'');
const page = Object.hasOwn(pages,path) ? pages[path] : null;
const study = document.querySelector('#study');
const progress = document.querySelector('#study-progress');
const studyRole = document.querySelector('#study-role');
const grid = document.querySelector('#study-grid');
const featurePage = document.querySelector('.feature-page');

function gradeCard(grade) {
  const card = document.createElement('section');
  card.className = 'grade-card';
  card.innerHTML = `<div class="sticker-heading"><h2>Địa lí lớp ${grade}</h2>
    <span class="feature-sticker" data-sticker="${grade === 8 ? 'book' : 'globe'}" aria-hidden="true"></span></div>
    <a class="grade-summary" href="/tom-tat?grade=${grade}">Tóm tắt SGK và sơ đồ tư duy</a>
    <a href="/luyen-tap?grade=${grade}">Luyện tập theo bài</a>
    <a href="/thi-thu?grade=${grade}">Thi thử</a>`;
  return card;
}
async function learningPage() {
  try {
    const response = await fetch('/api/me',{cache:'no-store'});
    if (!response.ok) throw new Error();
    const {user} = await response.json();
    const grades = user ? [8,9] : [];
    progress.hidden = grades.length === 0;
    studyRole.textContent = {teacher:'Giáo viên',guest:'Phiên khách'}[user?.role] || '';
    grid.replaceChildren(...grades.map(gradeCard));
    if (!grades.length) {
      const message = document.createElement('div');
      message.className = 'study-gate';
      message.innerHTML = '<p>Đăng nhập hoặc dùng thử để mở học liệu lớp 8 và lớp 9.</p><div class="study-entry"><a class="hero-action" href="/tai-khoan">Đăng nhập</a><button class="hero-action study-guest" type="button">Dùng thử với tư cách khách</button></div><p class="study-login-error" role="alert" hidden></p>';
      message.insertAdjacentHTML('beforeend','<span class="feature-sticker" data-sticker="book" aria-hidden="true"></span>');
      grid.append(message);
      const guest = message.querySelector('button');
      const feedback = message.querySelector('[role=alert]');
      guest.onclick = async () => {
        guest.disabled = true;
        feedback.hidden = true;
        try {
          await signInGuest();
          await learningPage();
        } catch (error) {
          feedback.textContent = error.message;
          feedback.hidden = false;
        } finally {
          guest.disabled = false;
        }
      };
    }
  } catch {
    grid.textContent = 'Chưa tải được góc học tập. Hãy tải lại trang.';
  }
}

if (page) {
  document.title = page.title + ' · Atlat Việt';
  featurePage.dataset.workspace = page.mode || 'study';
}
if (page?.mode === 'chapters') {
  document.querySelector('#workspace-parent').hidden = false;
  import('./chapters.js').then(({showChapters})=>showChapters(document.querySelector('#chapters'),url));
} else if (page?.mode) {
  const mode = page.mode;
  document.querySelector('#workspace-parent').hidden = !['practice','exam','progress'].includes(mode);
  const room = url.searchParams.get('room');
  openActivity(mode,{
    grade:url.searchParams.get('grade'),
    lessonId:url.searchParams.get('lesson') || undefined,
    code:mode === 'classroom' && room ? room.trim().toUpperCase() : undefined
  });
} else {
  study.hidden = false;
  learningPage();
}
