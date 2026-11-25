import { placeMedia } from './map-place-media.js';

const styles = document.createElement('link');
styles.rel = 'stylesheet';
styles.href = '/chapters.css';
document.head.append(styles);

function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text,href) {
  const node = element('a',text);
  node.href = href;
  return node;
}

function chapterPhoto(chapter) {
  const [file,credit,source,license] = placeMedia[chapter.photo];
  const figure = element('figure',null,'chapter-photo');
  const image = element('img');
  image.src = '/atlas/places/'+file+'.webp';
  image.alt = chapter.caption;
  image.decoding = 'async';
  const caption = element('figcaption');
  caption.append(element('strong',chapter.caption),element('small',credit),link('Nguồn ảnh',source));
  if (license) caption.append(link('Giấy phép',license));
  figure.append(image,caption);
  return figure;
}

function chapterArticle(chapter,grade) {
  const masthead = element('div',null,'chapter-masthead');
  const intro = element('header',null,'chapter-intro');
  intro.append(element('small',`SGK Lịch sử và Địa lí ${grade} · tr. ${chapter.pages}`),element('h2',chapter.name),element('p',chapter.focus));
  masthead.append(intro,chapterPhoto(chapter));

  const diagram = element('section',null,'chapter-mindmap');
  const nodes = element('ul',null,'chapter-nodes');
  diagram.append(element('h3','Sơ đồ tư duy'),element('p',chapter.name.split('. ')[1],'chapter-hub'),nodes);
  const summary = element('section',null,'chapter-notes');
  summary.append(element('h3','Tóm tắt kiến thức'));
  chapter.branches.forEach(([title,keyword,detail],i)=>{
    const item = element('li');
    const id = chapter.id+'-'+(i+1);
    const branch = link(title,'#'+id);
    branch.append(element('small',keyword));
    branch.onclick = event => {
      event.preventDefault();
      const target = document.getElementById(id);
      target.focus({preventScroll:true});
      target.scrollIntoView({block:'nearest'});
    };
    item.append(branch);
    nodes.append(item);
    const note = element('section');
    note.id = id;
    note.tabIndex = -1;
    note.append(element('h4',title),element('mark',keyword),element('p',detail));
    summary.append(note);
  });
  const callout = element('aside',null,'chapter-callout');
  callout.append(element('h3','Lưu ý khi ôn'),element('p',chapter.note));
  return [masthead,diagram,summary,callout];
}

export async function showChapters(target,url) {
  const grade = Number(url.searchParams.get('grade'));
  const title = element('h1',`Tóm tắt SGK ${[8,9].includes(grade) ? 'lớp '+grade : ''}`.trim());
  const heading = element('div',null,'study-head');
  heading.append(title);
  target.hidden = false;
  const status = element('p','Đang tải học liệu…','chapter-status');
  status.setAttribute('role','status');
  target.replaceChildren(heading,status);
  try {
    const response = await fetch('/api/chapters?grade='+grade,{cache:'no-store'});
    const data = await response.json();
    if (!response.ok) {
      status.replaceChildren(data.error || 'Chưa tải được học liệu.',' ',response.status === 401 ? link('Đăng nhập','/tai-khoan') : link('Về Góc học tập','/hoc-tap'));
      return;
    }
    const layout = element('div',null,'chapter-layout');
    const menu = element('nav',null,'chapter-menu');
    menu.setAttribute('aria-label','Mục lục tóm tắt');
    const article = element('article',null,'chapter-article');
    article.tabIndex = -1;
    const buttons = data.chapters.map(chapter=>{
      const button = element('button',chapter.name);
      button.type = 'button';
      button.onclick = () => selectChapter(chapter,true);
      return button;
    });
    function selectChapter(chapter,moveFocus) {
      buttons.forEach((button,i)=>{
        if (data.chapters[i] === chapter) button.setAttribute('aria-current','true');
        else button.removeAttribute('aria-current');
      });
      article.replaceChildren(...chapterArticle(chapter,grade));
      if (moveFocus) {
        url.searchParams.set('chuong',chapter.id);
        history.replaceState(history.state,'',url);
        article.focus({preventScroll:true});
        if (matchMedia('(max-width: 760px)').matches) article.scrollIntoView({block:'start'});
      }
    }
    menu.append(element('h2','Mục lục'),...buttons);
    layout.append(menu,article);
    selectChapter(data.chapters.find(chapter=>chapter.id === url.searchParams.get('chuong')) || data.chapters[0],false);
    status.replaceWith(layout);
  } catch {
    status.replaceChildren('Chưa tải được học liệu. ',link('Thử lại',url.href));
  }
}
