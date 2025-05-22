import { getElem } from './dom.js';
import { state } from './state.js';
import { heightToColour } from './utils.js';
import { fabricCanvas } from './pan.js';

export function requestRedraw() {
  if (!state.needsRedraw) {
    state.needsRedraw = true;
    requestAnimationFrame(()=>{
      state.needsRedraw = false;
      drawAll();
    });
  }
}

export function startRenderLoop() {
  window.addEventListener('resize', resizeCanvases);
}

export function resizeCanvases() {
  const mapCanvas = getElem('mapCanvas');
  const drawCanvas = getElem('drawingCanvas');
  const img = state.mapImage;
  if (!img) return;
  const rect = mapCanvas.parentElement.getBoundingClientRect();
  const w = rect.width;
  const h = rect.width * (img.naturalHeight / img.naturalWidth);
  mapCanvas.width  = w;
  mapCanvas.height = h;
  drawCanvas.width  = w;
  drawCanvas.height = h;
  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fabricCanvas.calcOffset();
  fabricCanvas.requestRenderAll();
  requestRedraw();
}

export function drawAll() {
  const mapCanvas = getElem('mapCanvas');
  const ctx       = mapCanvas.getContext('2d');
  const img       = state.mapImage;
  if (!img || !state.mapDef) return;

  const { posX, posY, scale } = state.mapDef;
  state.worldBounds = {
    minX: posX,
    maxX: posX + img.naturalWidth * scale,
    minY: posY - img.naturalHeight * scale,
    maxY: posY
  };

  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,mapCanvas.width,mapCanvas.height);
  ctx.translate(state.transform.offsetX, state.transform.offsetY);
  ctx.scale(state.transform.scale, state.transform.scale);
  ctx.drawImage(img, 0, 0, mapCanvas.width, mapCanvas.height);

  // height‐coloured dots
  state.entData.forEach(item=>{
    if(!item.enabled) return;
    item.ents.forEach(e=>{
      if(entityIsSkipped(e)) return;
      if(state.hideOutOfRange && (e.h<state.heightMin||e.h>state.heightMax)) return;
      const {cx,cy} = worldToCanvas(e.x,e.y);
      ctx.fillStyle = heightToColour(e.h);
      ctx.beginPath();
      ctx.arc(cx, cy, 5/ state.transform.scale, 0, 2*Math.PI);
      ctx.fill();
    });
  });

  // ziplines
  const zipIdx = state.entityTypeConfig.findIndex(c=>c.renderType==='zipline');
  if(zipIdx>-1 && state.entityTypeFilters[zipIdx]) {
    const cfg = state.entityTypeConfig[zipIdx];
    ctx.strokeStyle = cfg.color||'orange';
    ctx.lineWidth = (cfg.lineWidth||2)/state.transform.scale;
    state.zipSegments.forEach(seg=>{
      ctx.beginPath();
      seg.forEach((p,i)=>{
        const {cx,cy} = worldToCanvas(p.x,p.y);
        i?ctx.lineTo(cx,cy):ctx.moveTo(cx,cy);
      });
      ctx.stroke();
    });
  }

  // other entity‐types
  state.entityTypeConfig.forEach((c,i)=>{
    if(i===zipIdx || !state.entityTypeFilters[i]) return;
    state.entData.forEach(item=>{
      if(!item.enabled) return;
      item.ents.forEach(e=>{
        let pv = e.props[c.field]||'';
        if(c.valueRegex) {
          if(!new RegExp(c.valueRegex).test(pv)) return;
        } else if(c.value!==undefined) {
          if(pv!==c.value) return;
        }
        const {cx,cy} = worldToCanvas(e.x,e.y);
        const sx = cx*state.transform.scale + state.transform.offsetX;
        const sy = cy*state.transform.scale + state.transform.offsetY;

        if(c.renderType==='icon' && state.iconCache[i]?.complete) {
          const sz = c.size||24;
          ctx.setTransform(1,0,0,1,0,0);
          const src = c.tintColor ? state.tintedIconCache[i] : state.iconCache[i];
          ctx.drawImage(src, sx-sz/2, sy-sz/2, sz, sz);

        } else if(c.renderType==='circle') {
          const rW = c.radiusField
            ? parseFloat(e.props[c.radiusField]||0)
            : parseFloat(c.radius||0);
          if(!rW) return;
          const basePx = (rW / (state.worldBounds.maxX - state.worldBounds.minX)) * mapCanvas.width;
          const rpx = basePx * state.transform.scale;
          ctx.setTransform(1,0,0,1,0,0);
          ctx.fillStyle   = c.fillColor || 'rgba(255,0,0,0.25)';
          ctx.strokeStyle = c.strokeColor||'#ff4444';
          ctx.lineWidth   = (c.strokeWidth||2)/state.transform.scale;
          ctx.beginPath(); ctx.arc(sx, sy, rpx, 0, 2*Math.PI);
          ctx.fill(); ctx.stroke();

        } else if(c.renderType==='dot') {
          const or = c.outerRadius||8, ir = c.innerRadius||4;
          ctx.setTransform(1,0,0,1,0,0);
          ctx.fillStyle = c.outerColor||'lime';
          ctx.beginPath(); ctx.arc(sx, sy, or, 0, 2*Math.PI); ctx.fill();
          if(c.innerColor) {
            ctx.fillStyle = c.innerColor;
            ctx.beginPath(); ctx.arc(sx, sy, ir, 0, 2*Math.PI); ctx.fill();
          }

        } else if(c.renderType==='text') {
          let txt = c.textField
            ? (e.props[c.textField]||'')
            : (c.text||'');
          if(!txt) return;
          if(c.regexFind) txt = txt.replace(new RegExp(c.regexFind,'g'), c.regexReplace||'');
          if(c.replaceUnderscores) txt = txt.replace(/_/g,' ');
          if(c.case==='upper') txt = txt.toUpperCase();
          else if(c.case==='lower') txt = txt.toLowerCase();
          else if(c.case==='title') txt = txt.replace(/\w\S*/g,w=>w[0].toUpperCase()+w.slice(1));

          ctx.setTransform(1,0,0,1,0,0);
          const base = c.fontSize||14;
          const fs = c.scaleWithZoom ? base*state.transform.scale : base;
          ctx.font = `${fs}px ${c.fontFamily||'Arial'}`;
          ctx.fillStyle = c.textColor||'#fff';
          ctx.textAlign = c.textAlign||'center';
          ctx.textBaseline = c.textBaseline||'middle';
          ctx.fillText(txt, sx+(c.offsetX||0), sy+(c.offsetY||0));
        }
      });
    });
  });
}

function worldToCanvas(x,y) {
  const W = state.worldBounds;
  const cx = (x - W.minX)/(W.maxX - W.minX) * getElem('mapCanvas').width;
  const cy = getElem('mapCanvas').height - ( (y - W.minY)/(W.maxY - W.minY) * getElem('mapCanvas').height );
  return { cx, cy };
}

function entityIsSkipped(e) {
  return state.propertyKeys.some(k=>{
    if(state.filters[k].size===0 && !state.missingFilters[k]) return false;
    const v = e.props[k];
    if(v!==undefined && v!=='') return !state.filters[k].has(v);
    return !state.missingFilters[k];
  });
}
