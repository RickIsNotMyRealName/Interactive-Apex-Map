import { getElem } from './dom.js';
import { state } from './state.js';
import { requestRedraw } from './render.js';
import { heightToColour } from './utils.js';

export function buildAllUI() {
  buildEntityTypes();
  buildLegend();
  buildFilters();
  buildZipCache();
  rebuildHeightLegend();
}

export function buildEntityTypes() {
  const c = getElem('entityTypes');
  c.innerHTML = '';
  state.entityTypeConfig.forEach((cfg,i)=>{
    const lbl = document.createElement('label');
    const cb  = document.createElement('input');
    cb.type = 'checkbox';
    cb.onchange = ()=>{ state.entityTypeFilters[i]=cb.checked; requestRedraw(); };
    lbl.append(cb,' ',cfg.nickname);
    c.append(lbl);
  });
}

export function buildLegend() {
  const c = getElem('legend');
  c.innerHTML = '';
  state.entData.forEach(item=>{
    const lbl = document.createElement('label');
    const cb  = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = item.enabled;
    cb.onchange = ()=>{ item.enabled = cb.checked; requestRedraw(); };
    const sw = document.createElement('span');
    sw.style.cssText = `width:14px;height:14px;display:inline-block;margin-right:8px;
                        border:1px solid #999;background:${item.color}`;
    lbl.append(cb, sw, item.fileName);
    c.append(lbl);
  });
}

export function buildFilters() {
  const { propertyKeys, entData } = state;
  state.filters = {}; state.missingFilters = {};
  propertyKeys.forEach(k=>{ state.filters[k]=new Set(); state.missingFilters[k]=false; });
  entData.forEach(d=>d.ents.forEach(e=>{
    propertyKeys.forEach(k=>{ if(e.props[k]) state.filters[k].add(e.props[k]); });
  }));
  const c = getElem('filters');
  c.innerHTML = '';
  propertyKeys.forEach(key=>{
    const fg = document.createElement('div');
    fg.className = 'filter-group';
    fg.append(Object.assign(document.createElement('strong'),{textContent:key}));

    const allCB = document.createElement('input');
    allCB.type = 'checkbox';
    const allLbl = document.createElement('label');
    allLbl.append(allCB,' All');
    allCB.onchange = ()=>{
      fg.querySelectorAll('input[data-val]').forEach(ch=>{
        ch.checked = allCB.checked;
        ch.checked?state.filters[key].add(ch.dataset.val):state.filters[key].delete(ch.dataset.val);
      });
      requestRedraw();
    };
    fg.append(allLbl);

    const missCB = document.createElement('input');
    missCB.type = 'checkbox';
    const missLbl = document.createElement('label');
    missLbl.append(missCB,' Missing');
    missCB.onchange = ()=>{ state.missingFilters[key]=missCB.checked; requestRedraw(); };
    fg.append(missLbl);

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = `Search ${key}`;
    search.oninput = ()=>{
      const t = search.value.toLowerCase();
      fg.querySelectorAll('label[data-val]').forEach(l=>{
        l.style.display = l.textContent.toLowerCase().includes(t)?'block':'none';
      });
    };
    fg.append(search);

    Array.from(state.filters[key]).sort().forEach(v=>{
      const lbl = document.createElement('label');
      lbl.dataset.val = v;
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.dataset.val = v;
      cb.onchange = ()=>{ cb.checked?state.filters[key].add(v):state.filters[key].delete(v); requestRedraw(); };
      lbl.append(cb,' ',v);
      fg.append(lbl);
    });

    c.append(fg);
  });
}

export function buildZipCache() {
  state.zipSegments = [];
  const tmp = {};
  state.entData.forEach(d=>d.ents.forEach(e=>{
    if(e.props.classname==='zipline') tmp[e.props.link_guid]={start:e,end:null};
  }));
  state.entData.forEach(d=>d.ents.forEach(e=>{
    if(e.props.classname==='zipline_end'&&tmp[e.props.link_guid]) tmp[e.props.link_guid].end = e;
  }));
  Object.values(tmp).forEach(z=>{
    if(!z.start) return;
    const seg = [{x:z.start.x,y:z.start.y}];
    Object.entries(z.start.props).forEach(([k,v])=>{
      const m = k.match(/_zipline_rest_point_(\d+)/);
      if(m){
        const [rx,ry] = v.split(/\s+/).map(Number);
        seg.push({idx:+m[1],x:rx,y:ry});
      }
    });
    seg.sort((a,b)=>a.idx-b.idx);
    if(z.end) seg.push({x:z.end.x,y:z.end.y});
    if(seg.length>1) state.zipSegments.push(seg);
  });
}

export function rebuildHeightLegend() {
  const c = getElem('heightLegend');
  c.innerHTML = '';
  const grad = `linear-gradient(to right,
    ${state.belowClr} 0%,
    ${heightToColour(state.heightMin)} 0%,
    ${heightToColour(state.heightMax)} 100%,
    ${state.aboveClr} 100%)`;
  const bar = document.createElement('div');
  bar.style.cssText = `height:18px;background:${grad};border:1px solid #555;margin-bottom:4px`;
  c.append(bar);
  const lbl = document.createElement('div');
  lbl.style.cssText = 'display:flex;justify-content:space-between;font-size:0.75em;color:#aaa';
  lbl.innerHTML = `<span>&lt;${state.heightMin}</span><span>${state.heightMin}</span>
                   <span>${state.heightMax}</span><span>&gt;${state.heightMax}</span>`;
  c.append(lbl);
}
