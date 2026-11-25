import { regions, svg } from './geography.js';
import { places, regionalDetails } from './map-data.js';
import { extraPlaces, tourismIndex } from './map-places.js';

const map = document.querySelector('#geomap');
const legend = document.querySelector('#legend');
const panel = document.querySelector('#region-popup');
const picture = document.querySelector('#place-photo');
const photo = document.querySelector('#photo');
const viewToggle = document.querySelector('#view-toggle');
const mapViewport = document.querySelector('.map-viewport');
const details = document.querySelector('#map-details');
const search = document.querySelector('#map-search');
const results = document.querySelector('#map-results');
const layerSelect = document.querySelector('#map-layer');
const layerCaption = document.querySelector('#map-layer-caption');
const params = new URLSearchParams(location.search);
const layerNames = {34:'34 đơn vị hành chính cấp tỉnh hiện hành',63:'63 đơn vị hành chính cấp tỉnh tại mốc 2024',regions:'6 vùng kinh tế – xã hội theo SGK'};
const initialView = [100,3,665,548];
const maxZoom = 3;
const featured = places.map((place,region)=>({...place,region,image:'/atlas/regions/'+regions[region].photo+'.jpg',textbookPhoto:true,overview:true}));
const catalog = [...featured,...extraPlaces];
const regionEntries = regions.map((region,index)=>({
  kind:'region',region:index,name:region.name,locality:'Vùng địa lí',keywords:region.short
}));
const placeEntries = catalog.map(place=>({...place,kind:'place'}));
let zoom = 1;
let markerLayer;
let selected;
let locked;
let credits = [];
let hideTimer;
let filter = 'all';
let layer = params.has('vung') ? 'regions' : Object.hasOwn(layerNames,params.get('lop')) ? params.get('lop') : '34';
let terrain, provinces = {};

function appendLink(target,text,href) {
  const link = document.createElement('a');
  link.textContent = text;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  target.append(link);
}

function renderDetails(regionIndex) {
  const profile = regionalDetails[regionIndex];
  document.querySelector('#detail-title').textContent = regions[regionIndex].name;
  const sections = [
    ['Tự nhiên',profile.nature],
    ['Dân cư',profile.population],
    ['Kinh tế',profile.economy]
  ];
  const cards = sections.map(([heading,content]) => {
    const article = document.createElement('article');
    const title = document.createElement('h4');
    const text = document.createElement('p');
    title.textContent = heading;
    text.textContent = content;
    article.append(title,text);
    return article;
  });
  const source = document.createElement('small');
  source.textContent = profile.source;
  document.querySelector('#detail-sections').replaceChildren(...cards,source);
  details.hidden = false;
}

function showEntry(entry) {
  clearTimeout(hideTimer);
  selected = entry;
  map.classList.toggle('has-selected-place',locked?.kind === 'place');
  panel.hidden = !entry;
  document.querySelector('#map-info-hint').hidden = !!entry;
  document.querySelectorAll('[data-region]').forEach(control=>{
    const active = control.dataset.entry === entry?.name && control.dataset.kind === entry?.kind ||
      (!!entry && control.dataset.kind === 'region' && Number(control.dataset.region) === entry.region);
    control.setAttribute('aria-expanded',String(active));
  });
  if (!entry) return;

  const region = regions[entry.region];
  const place = entry.kind === 'place' ? entry : null;
  const credit = credits[entry.region];
  const imagePath = place ? place.image : featured[entry.region]?.image;
  picture.hidden = !imagePath;
  if (imagePath && photo.getAttribute('src') !== imagePath) photo.src = imagePath;
  photo.alt = place?.name || credit?.caption || region?.name || '';
  const sourceText = place?.credit || ((!place || place.textbookPhoto) && credit
    ? credit.caption+' · SGK '+credit.grade+', hình '+credit.figure+', tr. '+credit.page : '');
  document.querySelector('#photo-credit').textContent = sourceText;
  document.querySelector('#region-title').textContent = entry.name;
  document.querySelector('#region-summary').textContent = place
    ? place.note || [place.locality,region?.name].filter(Boolean).join(' · ')
    : region?.summary || entry.locality;

  const links = document.querySelector('#place-links');
  links.replaceChildren();
  if (place) {
    if (place.source) appendLink(links,place.photoSource || place.license ? 'Nguồn ảnh' : 'Tìm hiểu thêm',place.source);
    if (place.license) appendLink(links,'Giấy phép ảnh',place.license);
  }
  if (region) renderDetails(entry.region);
  else details.hidden = true;
}

function select(entry,trigger) {
  locked = entry;
  showEntry(entry);
  if (zoom > 1) setZoom(zoom);
  if (matchMedia('(max-width: 680px)').matches ||
      (trigger.closest('#map-results') && matchMedia('(max-width: 1080px)').matches)) {
    document.querySelector('.map-info').scrollIntoView({block:'nearest'});
  }
}

const normalize = text => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replaceAll('đ','d').trim();
function renderResults() {
  const terms = normalize(search.value).split(/\s+/).filter(Boolean);
  const entries = layer === 'regions' ? regionEntries : provinces[layer] || [];
  const rows = [...entries,...placeEntries].filter(row => (filter === 'all' || row.kind === filter) &&
    terms.every(word=>normalize([row.name,row.locality,row.keywords].join(' ')).includes(word)));
  document.querySelector('#map-result-count').textContent = rows.length ? rows.length+' kết quả' : 'Không tìm thấy kết quả ở lớp bản đồ này.';
  results.replaceChildren(...rows.map(row=>{
    const li = document.createElement('li');
    const button = document.createElement('button');
    const name = document.createElement('strong');
    const subtitle = document.createElement('small');
    button.type = 'button';
    button.className = 'map-result';
    button.style.setProperty('--swatch',regions[row.region]?.color || '#c3a77e');
    name.textContent = row.name;
    subtitle.textContent = row.locality || regions[row.region]?.short || 'Địa danh trong học liệu';
    button.append(name,subtitle);
    regionControl(button,row);
    li.append(button);
    return li;
  }));
  if (selected) showEntry(selected);
}
search.addEventListener('input',renderResults);
const filters = document.querySelectorAll('[data-filter]');
function setFilter(value) {
  filter = value;
  filters.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.filter === value)));
}
function showLayer(value) {
  layer = value;
  layerSelect.value = value;
  layerCaption.textContent = layerNames[value];
  if (terrain) map.setAttribute('aria-label',layerNames[value]);
  legend.hidden = value !== 'regions';
  if ((filter === 'province' && value === 'regions') || (filter === 'region' && value !== 'regions')) setFilter('all');
  if (locked && locked.kind !== 'place') locked = undefined;
  if (selected && selected.kind !== 'place') showEntry(undefined);
  if (terrain) draw(terrain);
  renderResults();
  setZoom(zoom);
}
layerSelect.onchange = () => {
  params.delete('vung');
  params.set('lop',layerSelect.value);
  history.replaceState(history.state,'',location.pathname+'?'+params);
  showLayer(layerSelect.value);
};
filters.forEach(button=>{
  button.onclick = ()=>{
    const value = button.dataset.filter;
    if (value === 'region' && layer !== 'regions') showLayer('regions');
    if (value === 'province' && layer === 'regions' && provinces['34']) showLayer('34');
    setFilter(value);
    renderResults();
  };
});

function scheduleClose() {
  clearTimeout(hideTimer);
  if (!locked) hideTimer = setTimeout(()=>showEntry(undefined),240);
}

function regionControl(element,entry) {
  element.dataset.region = entry.region ?? '';
  element.dataset.entry = entry.name;
  element.dataset.kind = entry.kind;
  if (entry.kind === 'place') element.dataset.place = 'true';
  element.setAttribute('aria-controls','region-popup');
  element.setAttribute('aria-expanded','false');
  element.addEventListener('pointerenter',event=>{
    if (event.pointerType === 'mouse' && !locked) showEntry(entry);
  });
  element.addEventListener('pointerleave',scheduleClose);
  element.addEventListener('focus',()=>{if (!locked) showEntry(entry);});
  element.addEventListener('blur',scheduleClose);
  element.addEventListener('click',()=>select(entry,element));
  if (element instanceof SVGElement) element.addEventListener('keydown',event=>{
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(entry,element);
    }
  });
}
panel.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
panel.addEventListener('pointerleave',scheduleClose);
panel.addEventListener('focusin',()=>clearTimeout(hideTimer));
regions.forEach((region,index)=>{
  const button = document.createElement('button');
  button.type = 'button';
  button.style.setProperty('--swatch',region.color);
  button.textContent = region.short;
  regionControl(button,regionEntries[index]);
  legend.append(button);
});
const selectedRegion = params.get('vung');
const initialIndex = regions.findIndex(region=>region.photo === selectedRegion);
if (initialIndex >= 0) select(regionEntries[initialIndex],legend.children[initialIndex]);
renderResults();

function markerPosition(place) {
  const [longitude,latitude] = place.coordinates;
  // The outline was projected from longitude/latitude using these extents.
  return [236.5+(longitude-102.14588)*29.663,35.2+(23.39097-latitude)*32.988];
}
function setZoom(level) {
  zoom = Math.max(1,Math.min(level,maxZoom));
  const [left,top,width,height] = initialView;
  const w = width/zoom;
  const h = height/zoom;
  let centerX = left+width/2;
  let centerY = top+height/2;
  const target = selected?.coordinates ? selected : featured[selected?.region];
  if (target && markerLayer) {
    const [x,y] = markerPosition(target);
    const viewMatrix = map.getCTM();
    const markerMatrix = markerLayer.getCTM();
    const matrix = viewMatrix && markerMatrix && viewMatrix.inverse().multiply(markerMatrix);
    if (matrix) ({x:centerX,y:centerY} = new DOMPoint(x,y).matrixTransform(matrix));
  }
  const x = Math.min(Math.max(centerX-w/2,left),left+width-w);
  const y = Math.min(Math.max(centerY-h/2,top),top+height-h);
  map.setAttribute('viewBox', [x,y,w,h].join(' '));
  map.classList.toggle('is-zoomed',zoom >= 1.5);
  document.querySelector('#zoom-out').disabled = zoom === 1;
  document.querySelector('#zoom-in').disabled = zoom === maxZoom;
}
document.querySelector('#zoom-in').onclick = () => setZoom(zoom+.5);
document.querySelector('#zoom-out').onclick = () => setZoom(zoom-.5);
document.querySelector('#zoom-reset').onclick = () => setZoom(1);
setZoom(1);
const pinToggle = document.querySelector('#pin-toggle');
pinToggle.onclick = () => {
  const visible = pinToggle.getAttribute('aria-pressed') !== 'true';
  pinToggle.setAttribute('aria-pressed',String(visible));
  if (markerLayer) markerLayer.classList.toggle('hide-pins',!visible);
};

function draw(terrain) {
  map.replaceChildren();
  const defs = svg('defs',{});
  terrain.region.forEach((path,index) => {
    defs.append(svg('path',{id:'shape-'+index,d:path}));
    const clip = svg('clipPath',{id:'clip-'+index});
    clip.append(svg('use',{href:'#shape-'+index}));
    defs.append(clip);
    const gradient = svg('linearGradient',{id:'ink-'+index,x1:'0%',y1:'0%',x2:'85%',y2:'95%'});
    gradient.append(svg('stop',{offset:'0%','stop-color':regions[index].light}),svg('stop',{offset:'100%','stop-color':regions[index].color}));
    defs.append(gradient);
  });
  map.append(defs);
  const scene = svg('g',{class:'map-scene'});
  scene.append(svg('path',{d:terrain.land,fill:'#eee5c6',stroke:'#bbbf9f','stroke-width':1.15}));
  const depth = svg('g',{class:'map-depth','pointer-events':'none'});
  const surfaces = svg('g',{class:'map-surfaces'});
  if (layer === 'regions') {
    for (const dy of [10,8,6,4,2]) {
      terrain.region.forEach((_,index) => depth.append(svg('use',{href:'#shape-'+index,transform:'translate(0 '+dy+')',fill:regions[index].side,stroke:regions[index].side,'stroke-width':1})));
    }
    terrain.region.forEach((_,index) => {
      const face = svg('use',{href:'#shape-'+index,fill:'url(#ink-'+index+')',stroke:'#fff5d7','stroke-width':1.3,tabindex:0,role:'button','aria-label':regions[index].name});
      regionControl(face,regionEntries[index]);
      surfaces.append(face);
    });
  } else {
    const fills = ['#83b59b','#beda9e','#9bc7ae','#aec9ad','#a4ba84'];
    (provinces[layer] || []).forEach((province,index)=>{
      const id = 'province-'+province.code;
      defs.append(svg('path',{id,d:province.path,'fill-rule':'evenodd'}));
      const href = '#'+id;
      depth.append(svg('use',{href,transform:'translate(0 6)',fill:'#47775e',stroke:'#47775e','stroke-width':.7}));
      const face = svg('use',{href,fill:fills[index%fills.length],stroke:'#faf4df','stroke-width':1,tabindex:0,role:'button','aria-label':province.locality});
      face.append(svg('title',{},province.locality));
      regionControl(face,province);
      surfaces.append(face);
    });
  }
  scene.append(depth,surfaces);

  // Stylized peaks add depth to the model. Their heights are illustrative.
  const ranges = [
    [[273,98,20],[295,106,22],[312,82,24],[339,85,13],[350,110,15],[298,125,13]],
    [], [[318,169,11],[328,191,14],[347,214,12],[359,229,11]],
    [[394,306,13],[402,331,19],[409,352,20],[398,368,13],[401,388,13]],
    [], []
  ];
  if (layer === 'regions') ranges.forEach((peaks,index)=>{
    const group = svg('g',{class:'map-peaks','clip-path':'url(#clip-'+index+')','pointer-events':'none'});
    for (const [x,y,h] of peaks) {
      group.append(svg('path',{d:`M${x-h*.57},${y+4} L${x},${y-h} L${x+h*.7},${y+4} L${x},${y+8}Z`,fill:'#eff0b1',opacity:.82}));
      group.append(svg('path',{d:`M${x},${y-h} L${x+h*.7},${y+4} L${x},${y+8}Z`,fill:'#264f3b',opacity:.48}));
    }
    scene.append(group);
  });
  for (const [x,y,caption,cssClass] of [[185,193,'LÀO','country'],[220,383,'CAM-PU-CHIA','country'],[483,68,'TRUNG QUỐC','country'],[578,306,'Biển Đông','sea'],[453,162,'Vịnh Bắc Bộ','water'],[584,244,'QĐ. Hoàng Sa','island'],[602,450,'QĐ. Trường Sa','island']]) {
    scene.append(svg('text',{x,y,class:cssClass,'text-anchor':'middle','pointer-events':'none'},caption));
  }
  for (const [x,y] of [[580,224],[589,228],[574,231],[596,429],[607,434],[614,422]]) {
    scene.append(svg('circle',{cx:x,cy:y,r:2.2,fill:'#648663','pointer-events':'none'}));
  }
  markerLayer = svg('g',{class:'map-markers'});
  markerLayer.classList.toggle('hide-pins',pinToggle.getAttribute('aria-pressed') !== 'true');
  placeEntries.filter(place=>place.coordinates).forEach(place => {
    const [x,y] = markerPosition(place);
    const marker = svg('g',{transform:'translate('+x+' '+y+')',class:'map-marker',tabindex:0,role:'button','aria-label':place.name});
    if (place.overview) marker.dataset.overview = 'true';
    marker.append(svg('circle',{r:12,fill:'transparent'}));
    marker.append(svg('circle',{r:5,class:'map-marker-dot'}));
    marker.append(svg('text',{x:8,y:4,class:'map-marker-label'},place.name));
    regionControl(marker,place);
    markerLayer.append(marker);
  });
  scene.append(markerLayer);
  map.append(scene);
  if (selected) showEntry(selected);
}
viewToggle.onclick = () => {
  const now3D = viewToggle.getAttribute('aria-pressed') !== 'true';
  viewToggle.setAttribute('aria-pressed',String(now3D));
  viewToggle.textContent = now3D ? 'Góc nhìn 3D' : 'Góc nhìn 2D';
  mapViewport.classList.toggle('map-flat',!now3D);
};

async function loadMapData() {
  const read = async path => {
    const response = await fetch('/atlas/'+path);
    if (!response.ok) throw new Error();
    return response.json();
  };
  const [land,admin] = await Promise.allSettled([read('terrain.json'),read('provinces.json')]);
  if (land.status === 'fulfilled') terrain = land.value;
  else map.setAttribute('aria-label','Hãy chọn mục trong danh sách tìm kiếm.');
  if (admin.status === 'fulfilled') {
    provinces = Object.fromEntries(Object.entries(admin.value).map(([year,rows])=>[year,rows.map(({kind,...province})=>({
      ...province,kind:'province',keywords:kind,locality:kind+' '+province.name+' · '+(year === '63' ? 'mốc 2024' : 'hiện hành')
    }))]));
  } else {
    layerSelect.querySelectorAll('option:not([value=regions])').forEach(option=>{ option.disabled = true; });
    document.querySelector('[data-filter=province]').disabled = true;
    layer = 'regions';
  }
  if (initialIndex >= 0) {
    layerSelect.value = layer;
    layerCaption.textContent = layerNames[layer];
    if (terrain) {
      map.setAttribute('aria-label',layerNames[layer]);
      draw(terrain);
    }
  } else showLayer(layer);
}
loadMapData();
fetch('/atlas/regions/credits.json').then(response=>response.json()).then(data=>{
  credits = data;
  if (selected) showEntry(selected);

}).catch(()=>{});
