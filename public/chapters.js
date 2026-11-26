import { placeMedia } from './map-place-media.js';
import { svg } from './geography.js';

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

function chapterMindmap(chapter) {
  const diagram = element('section',null,'chapter-mindmap');
  diagram.setAttribute('aria-labelledby','chapter-mindmap-title');
  const heading = element('h3','Sơ đồ tư duy');
  heading.id = 'chapter-mindmap-title';
  const graph = element('div',null,'chapter-graph');
  const hub = element('p',chapter.mapTitle || chapter.name,'chapter-hub');
  const nodes = element('ul',null,'chapter-nodes');
  nodes.setAttribute('role','list');
  const lines = svg('svg',{class:'chapter-connections','aria-hidden':'true',focusable:'false'});

  const hasTopBranch = chapter.branches.length % 2;
  const firstSideRow = 1+hasTopBranch;
  hub.style.setProperty('--first-row',firstSideRow);
  hub.style.setProperty('--row-span',Math.max(1,Math.floor(chapter.branches.length/2)));
  chapter.branches.forEach(([title,keyword],i)=>{
    const item = element('li');
    const sideIndex = i-hasTopBranch;
    item.dataset.branch = i+1;
    item.style.setProperty('--column',sideIndex < 0 ? 2 : (sideIndex%2)*2+1);
    item.style.setProperty('--row',sideIndex < 0 ? 1 : firstSideRow+Math.floor(sideIndex/2));
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
  });
  graph.append(lines,hub,nodes);
  diagram.append(heading,graph);
  return diagram;
}

function observeMindmap(graph) {
  const hub = graph.querySelector('.chapter-hub');
  const nodes = [...graph.querySelectorAll('.chapter-nodes a')];
  const lines = graph.querySelector('.chapter-connections');
  const observer = new ResizeObserver(()=>{
    const frame = graph.getBoundingClientRect();
    const center = node => {
      const box = node.getBoundingClientRect();
      return [box.left-frame.left+box.width/2,box.top-frame.top+box.height/2];
    };
    const [x,y] = center(hub);
    const ends = nodes.map(center);
    const compact = getComputedStyle(graph).getPropertyValue('--compact').trim() === '1';
    const branches = ends.map(([endX,endY],i)=>{
      const bend = compact ? x : (x+endX)/2;
      const start = compact ? Math.max(y,endY-18) : y;
      return svg('path',{
        d:`M${x} ${start} C${bend} ${start} ${bend} ${endY} ${endX} ${endY}`,
        class:'chapter-connection',
        'data-branch':i+1
      });
    });
    if (compact) {
      branches.unshift(svg('path',{d:`M${x} ${y} V${Math.max(...ends.map(([,endY])=>endY))-18}`,class:'chapter-connection'}));
    }
    lines.setAttribute('viewBox',`0 0 ${frame.width} ${frame.height}`);
    lines.replaceChildren(...branches);
  });
  observer.observe(graph);
  observer.observe(hub);
  nodes.forEach(node=>observer.observe(node));
  return observer;
}

function chapterArticle(chapter,grade) {
  const masthead = element('div',null,'chapter-masthead');
  const intro = element('header',null,'chapter-intro');
  intro.append(element('small',`SGK Lịch sử và Địa lí ${grade} · tr. ${chapter.pages}`),element('h2',chapter.name),element('p',chapter.focus));
  masthead.append(intro,chapterPhoto(chapter));

  const summary = element('section',null,'chapter-notes');
  summary.append(element('h3','Tóm tắt kiến thức'));
  chapter.branches.forEach(([title,keyword,detail],i)=>{
    const note = element('section');
    note.id = chapter.id+'-'+(i+1);
    note.tabIndex = -1;
    note.append(element('h4',title),element('mark',keyword),element('p',detail));
    summary.append(note);
  });
  const callout = element('aside',null,'chapter-callout');
  callout.append(element('h3','Lưu ý khi ôn'),element('p',chapter.note));
  return [masthead,chapterMindmap(chapter),summary,callout];
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
    let mindmapObserver;
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
      mindmapObserver?.disconnect();
      article.replaceChildren(...chapterArticle(chapter,grade));
      mindmapObserver = observeMindmap(article.querySelector('.chapter-graph'));
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
