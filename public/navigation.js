const path = location.pathname.replace(/\/$/,'') || '/';
const links = [
  ['/ban-do','Bản đồ','M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15'],
  ['/hoc-tap','Góc học tập','M12 6Q7 3 3 5v14q4-2 9 1 5-3 9-1V5q-4-2-9 1v14'],
  ['/phong-hoc','Vào phòng','M15 20v-2q0-4-6-4t-6 4v2 M14 9a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M16 6q5 0 4 5 M17 15q4 0 4 5']
];
const icon = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${d}"/></svg>`;
const header = document.querySelector('.site-head');
header.innerHTML = `<div class="head-inner">
  <a href="/" class="brand"><img src="/atlas/mark.svg" width="40" height="40" alt="">Atlat Việt</a>
  <nav class="main-nav" aria-label="Điều hướng chính">${links.map(([href,label,d])=>`<a href="${href}"${path === href ? ' aria-current="page"' : ''}>${icon(d)}${label}</a>`).join('')}</nav>
  <a href="/tai-khoan" class="account-btn">${icon('M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M4 21q0-7 8-7t8 7')}<span>Đăng nhập</span></a>
</div>`;

async function updateAccount() {
  try {
    const response = await fetch('/api/me',{cache:'no-store'});
    const {user} = await response.json();
    header.querySelector('.account-btn span').textContent = user?.name || 'Đăng nhập';
  } catch {}
}
window.addEventListener('study:account',updateAccount);
updateAccount();
