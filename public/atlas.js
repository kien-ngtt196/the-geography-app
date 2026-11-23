const regions = [
  {name:'Trung du và miền núi phía Bắc',short:'Miền núi phía Bắc',color:'#81a981',photo:'vietnam_hero',summary:'Từ thung lũng tới núi cao, địa hình tạo nên nhiều đai khí hậu. Khám phá mối liên hệ giữa độ cao, cây trồng và tiềm năng thuỷ điện.',eight:[2,4,7],nine:[11,6,8]},
  {name:'Đồng bằng sông Hồng',short:'Đồng bằng sông Hồng',color:'#b2c481',photo:'red_river',summary:'Phù sa sông Hồng bồi đắp đồng bằng. Dân cư đông đúc, hệ thống đê và nghề trồng lúa gắn bó với nhau như thế nào?',eight:[6,9,13],nine:[12,2,5]},
  {name:'Bắc Trung Bộ',short:'Bắc Trung Bộ',color:'#e7bf78',photo:'hue_citadel',summary:'Từ Trường Sơn ra biển là một dải đất hẹp ngang. Theo dấu gió phơn, dòng sông ngắn và mùa lũ để hiểu cách người dân thích ứng.',eight:[4,6,8],nine:[13,14,6]},
  {name:'Duyên hải Nam Trung Bộ và Tây Nguyên',short:'Nam Trung Bộ và Tây Nguyên',color:'#cc977a',summary:'Các cao nguyên đất badan nối với dải duyên hải qua nhiều tuyến giao thông. Cùng tìm hiểu cây công nghiệp, cảng biển và nguồn nước mùa khô.',eight:[2,6,9],nine:[15,5,20]},
  {name:'Đông Nam Bộ',short:'Đông Nam Bộ',color:'#b799b1',summary:'Đất badan, đất xám và mạng lưới đô thị tạo nên những vùng cây công nghiệp, trung tâm sản xuất và đầu mối giao thương.',eight:[9,7,2],nine:[16,17,8]},
  {name:'Đồng bằng sông Cửu Long',short:'Đồng bằng sông Cửu Long',color:'#80b4ac',photo:'mekong_delta',summary:'Mạng lưới kênh rạch đưa nước và phù sa tới ruộng lúa, vườn cây. Quan sát cách vùng châu thổ thích ứng với mùa nước nổi và xâm nhập mặn.',eight:[6,8,13],nine:[18,19,5]}
];
const svgNS='http://www.w3.org/2000/svg';
function svg(tag,attrs,text){
  const el=document.createElementNS(svgNS,tag);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  if(text)el.textContent=text;
  return el;
}
const icons={map:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',book:'M12 6Q7 3 3 5v14q4-2 9 1 5-3 9-1V5q-4-2-9 1v14',pen:'M4 20l4-1L20 7l-4-4L4 15z M13 6l4 4',users:'M15 20v-2q0-4-6-4t-6 4v2 M14 9a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M16 6q5 0 4 5 M17 15q4 0 4 5',user:'M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0 M4 21q0-7 8-7t8 7',pin:'M12 21s7-8 7-13A7 7 0 0 0 5 8q0 5 7 13z M14 8a2 2 0 1 0-4 0 2 2 0 0 0 4 0',compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M16 7l-2 7-7 3 3-8z',chart:'M4 3v17h17 M8 15v-4 M13 15V7 M18 15v-6',chevron:'m9 5 7 7-7 7'};
for(const i of document.querySelectorAll('[data-icon]')){
  const icon=svg('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':1.65,'stroke-linejoin':'round','stroke-linecap':'round','aria-hidden':true});
  icon.append(svg('path',{d:icons[i.dataset.icon]}));i.replaceChildren(icon);
}
const map=document.querySelector('#geomap'),legend=document.querySelector('#legend');
const catalog=new Map();
let selected=0, grade=8, terrain;
function openActivity(mode,lessonId){window.study.open(mode,{grade,lessonId});}
for(const b of document.querySelectorAll('[data-mode]')) b.onclick=()=>openActivity(b.dataset.mode);
function update(){
  const r=regions[selected];
  document.querySelector('#region-title').textContent=r.name;
  document.querySelector('#region-summary').textContent=r.summary;
  const photo=document.querySelector('#photo');
  if(r.photo) photo.style.backgroundImage='url("/atlas/'+r.photo+'.jpg")';
  else if(terrain){
    const inset=svg('svg',{xmlns:svgNS,viewBox:selected===4?'290 390 170 85':'330 300 190 95'});
    inset.append(svg('rect',{width:800,height:550,fill:'#cde7e7'}),svg('path',{d:terrain.land,fill:'#e8e4c9'}));
    terrain.region.forEach((d,j)=>inset.append(svg('path',{d,fill:j===selected?r.color:'#c6cfad',stroke:'white','stroke-width':.7})));
    photo.style.backgroundImage='url("data:image/svg+xml,'+encodeURIComponent(inset.outerHTML)+'")';
  }
  document.querySelectorAll('[data-region]').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.region===selected)));
  const list=document.querySelector('#region-lessons');list.replaceChildren();
  const book=catalog.get(grade);
  if(!book){list.textContent='Đang tải bài học…';return;}
  for(const n of grade===8?r.eight:r.nine){
    const lesson=book.find(l=>l.id==='g'+grade+'_l'+n);if(!lesson)continue;
    const b=document.createElement('button');b.type='button';b.textContent=lesson.title;b.onclick=()=>openActivity('practice',lesson.id);list.append(b);
  }
}
function select(i){selected=i;update();}
regions.forEach((r,i)=>{
  const b=document.createElement('button');b.dataset.region=i;b.style.setProperty('--swatch',r.color);b.textContent=r.short;b.onclick=()=>select(i);legend.append(b);
});
function draw(t){
  terrain=t;
  map.append(svg('path',{d:t.land,fill:'#e5e5ce',stroke:'#b4c3ac','stroke-width':1}));
  t.region.forEach((d,i)=>{
    const p=svg('path',{d,fill:regions[i].color,stroke:'#fff9e8','stroke-width':1.15,tabindex:0,role:'button','data-region':i,'aria-label':regions[i].name});
    p.onpointerenter=e=>{if(e.pointerType==='mouse')select(i);};p.onfocus=()=>select(i);p.onclick=()=>select(i);p.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select(i);}};
    map.append(p);
  });
  for(const [x,y,s,c] of [[180,190,'LÀO','country'],[220,387,'CAM-PU-CHIA','country'],[470,50,'TRUNG QUỐC','country'],[584,312,'Biển Đông','sea'],[444,169,'Vịnh Bắc Bộ','water'],[585,251,'QĐ. Hoàng Sa','island'],[641,454,'QĐ. Trường Sa','island']]){
    map.append(svg('text',{x,y,class:c,'text-anchor':'middle','pointer-events':'none'},s));
  }
  for(const [x,y] of [[580,230],[589,234],[574,237],[634,432],[645,437],[653,425]]) map.append(svg('circle',{cx:x,cy:y,r:2,fill:'#7d9571','pointer-events':'none'}));
  update();
}
async function loadGrade(g){
  grade=g;document.querySelectorAll('[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.grade===g)));update();
  try{if(!catalog.has(g)){const res=await fetch('/api/catalog?grade='+g);if(!res.ok)throw Error();catalog.set(g,(await res.json()).lessons);}update();}
  catch{if(g===grade){const box=document.querySelector('#region-lessons');box.textContent='Chưa tải được bài học. ';const retry=document.createElement('button');retry.textContent='Thử lại';retry.onclick=()=>loadGrade(g);box.append(retry);}}
}
document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>loadGrade(+b.dataset.grade));
fetch('/atlas/terrain.json').then(r=>r.json()).then(draw).catch(()=>map.setAttribute('aria-label','Hãy chọn vùng trong chú giải bên dưới.'));
loadGrade(8);
async function account(){try{const {user}=await (await fetch('/api/me')).json();document.querySelector('.account-btn span').textContent=user?.name || 'Tài khoản';}catch{}}
window.addEventListener('study:account',account);account();
