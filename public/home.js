import { regions, svg } from './geography.js';

const route = new URLSearchParams(location.search);
const invited = route.get('room');
if (invited) location.replace('/phong-hoc?room=' + encodeURIComponent(invited));

const preview = document.querySelector('#hero-map-preview');
const panel = document.querySelector('.hero-region');
const photo = document.querySelector('#hero-region-photo');
let selected = 0;

function updateRegion() {
  const region = regions[selected];
  photo.src = '/atlas/regions/' + region.photo + '.jpg';
  document.querySelector('#hero-region-title').textContent = region.name;
  preview.querySelectorAll('[data-face]').forEach(face => {
    face.classList.toggle('hero-map-selected', Number(face.dataset.face) === selected);
    face.setAttribute('aria-pressed',String(Number(face.dataset.face) === selected));
  });
}

async function loadPreview() {
  const response = await fetch('/atlas/terrain.json');
  if (!response.ok) return;
  const terrain = await response.json();
  const defs = svg('defs',{});
  const scene = svg('g',{class:'hero-map-scene'});
  terrain.region.forEach((path,i) => {
    defs.append(svg('path',{d:path,id:'hero-shape-'+i}));
    const gradient = svg('linearGradient',{id:'hero-ink-'+i,x1:'0%',y1:'0%',x2:'80%',y2:'100%'});
    gradient.append(svg('stop',{offset:'0%','stop-color':regions[i].light}),svg('stop',{offset:'100%','stop-color':regions[i].color}));
    defs.append(gradient);
  });
  for (const y of [18,15,12,9,6,3]) {
    terrain.region.forEach((_,i) => {
      scene.append(svg('use',{href:'#hero-shape-'+i,transform:'translate(0 '+y+')',fill:regions[i].side,stroke:regions[i].side,'stroke-width':1.6,'pointer-events':'none'}));
    });
  }
  terrain.region.forEach((_,i) => {
    const face = svg('use',{href:'#hero-shape-'+i,'data-face':i,fill:'url(#hero-ink-'+i+')',stroke:'#fff1bf','stroke-width':1.5,tabindex:0,role:'button','aria-label':regions[i].name});
    const show = () => { selected = i; updateRegion(); };
    face.addEventListener('pointerenter',show);
    face.addEventListener('focus',show);
    face.addEventListener('click',show);
    face.addEventListener('keydown',event=>{
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        show();
      }
    });
    scene.append(face);
  });
  preview.append(defs,scene);
  updateRegion();
}

updateRegion();
panel.hidden = false;
loadPreview().catch(()=>{});

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('will-reveal');
      observer.unobserve(entry.target);
    }
  }, {threshold:.16});

  for (const band of document.querySelectorAll('.feature-band')) {
    if (band.getBoundingClientRect().top < window.innerHeight) continue;
    band.classList.add('will-reveal');
    observer.observe(band);
  }
}
