import { pages } from './routes.js';
import { openActivity } from './activities.js';

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
    const grades = user?.role === 'teacher' ? [8,9] : user?.grade ? [user.grade] : [];
    progress.hidden = grades.length === 0;
    studyRole.textContent = user?.role === 'teacher' ? 'Giáo viên' : '';
    grid.replaceChildren(...grades.map(gradeCard));
    if (!grades.length) {
      const message = document.createElement('div');
      message.className = 'study-gate';
      message.innerHTML = user
        ? '<p>Chọn khối lớp để mở danh mục bài học.</p><a class="hero-action" href="/tai-khoan">Chọn khối lớp</a>'
        : '<p>Đăng nhập để luyện tập, thi thử và xem tiến độ theo khối lớp.</p><a class="hero-action" href="/tai-khoan">Đăng nhập</a>';
      message.insertAdjacentHTML('beforeend','<span class="feature-sticker" data-sticker="book" aria-hidden="true"></span>');
      grid.append(message);
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
