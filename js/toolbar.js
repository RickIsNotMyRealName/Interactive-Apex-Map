import { fabricCanvas } from './pan.js';
import { getElem } from './dom.js';
import { requestRedraw } from './render.js';
import { getViewportCenter } from './utils.js';

function activateTool(btnId) {
  document.querySelectorAll('#toolbar button').forEach(b=>b.classList.remove('active'));
  getElem(btnId).classList.add('active');
}

export function bindToolbar() {
  getElem('selectBtn').onclick = () => {
    activateTool('selectBtn');
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;
    fabricCanvas.forEachObject(o=>o.selectable=true);
  };

  getElem('rectBtn').onclick = () => {
    activateTool('rectBtn');
    fabricCanvas.isDrawingMode = false;
    const { x,y } = getViewportCenter();
    const r = new fabric.Rect({
      left: x, top: y,
      width:100, height:60,
      originX:'center', originY:'center',
      fill:'rgba(0,0,0,0)', stroke:'#000', strokeWidth:2
    });
    fabricCanvas.add(r).setActiveObject(r);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  };

  getElem('circleBtn').onclick = () => {
    activateTool('circleBtn');
    fabricCanvas.isDrawingMode = false;
    const { x,y } = getViewportCenter();
    const c = new fabric.Circle({
      left: x, top: y,
      originX:'center', originY:'center',
      radius:40,
      fill:'rgba(0,0,0,0)', stroke:'#000', strokeWidth:2
    });
    fabricCanvas.add(c).setActiveObject(c);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  };

  getElem('ellipseBtn').onclick = () => {
    activateTool('ellipseBtn');
    fabricCanvas.isDrawingMode = false;
    const { x,y } = getViewportCenter();
    const e = new fabric.Ellipse({
      left: x, top: y,
      originX:'center', originY:'center',
      rx:60, ry:30,
      fill:'rgba(0,0,0,0)', stroke:'#000', strokeWidth:2
    });
    fabricCanvas.add(e).setActiveObject(e);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  };

  getElem('pencilBtn').onclick = () => {
    activateTool('pencilBtn');
    fabricCanvas.isDrawingMode = true;
    fabricCanvas.freeDrawingBrush.width = 2;
    fabricCanvas.freeDrawingBrush.color = '#000';
    fabricCanvas.freeDrawingCursor = 'crosshair';
  };

  getElem('textBtn').onclick = () => {
    activateTool('textBtn');
    fabricCanvas.isDrawingMode = false;
    const { x,y } = getViewportCenter();
    const t = new fabric.IText('Edit me',{
      left:x, top:y,
      originX:'center', originY:'center',
      fontSize:20, fill:'#000'
    });
    fabricCanvas.add(t).setActiveObject(t);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  };

  getElem('arrowBtn').onclick = () => {
    activateTool('arrowBtn');
    fabricCanvas.isDrawingMode = false;
    const { x,y } = getViewportCenter();
    const line = new fabric.Line([-50,0,50,0],{
      stroke:'#000', strokeWidth:2,
      originX:'center', originY:'center'
    });
    const head = new fabric.Triangle({
      left:50, top:0,
      originX:'center', originY:'center',
      width:10, height:10, angle:90, fill:'#000'
    });
    const arrow = new fabric.Group([line,head],{
      left:x, top:y,
      originX:'center', originY:'center'
    });
    fabricCanvas.add(arrow).setActiveObject(arrow);
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  };

  getElem('imageInput').addEventListener('change', e=>{
    activateTool('imageInput');
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = evt=>{
      fabric.Image.fromURL(evt.target.result, img=>{
        const { x,y } = getViewportCenter();
        img.set({ left:x, top:y, originX:'center', originY:'center', scaleX:0.5, scaleY:0.5 });
        fabricCanvas.add(img).setActiveObject(img);
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
      });
    };
    reader.readAsDataURL(f);
  });

  getElem('groupBtn').onclick = ()=> {
    activateTool('groupBtn');
    const sel = fabricCanvas.getActiveObjects();
    if(sel.length>1){
      const grp = new fabric.Group(sel);
      fabricCanvas.discardActiveObject();
      fabricCanvas.add(grp).setActiveObject(grp);
    }
  };

  getElem('ungroupBtn').onclick = ()=> {
    activateTool('ungroupBtn');
    const obj = fabricCanvas.getActiveObject();
    if(obj && obj.type==='group'){
      obj.toActiveSelection();
      fabricCanvas.requestRenderAll();
    }
  };

  getElem('bringForwardBtn').onclick = ()=> fabricCanvas.getActiveObject()?.bringForward();
  getElem('sendBackwardBtn').onclick = ()=> fabricCanvas.getActiveObject()?.sendBackwards();

  getElem('deleteBtn').onclick = ()=> {
    activateTool('deleteBtn');
    const active = fabricCanvas.getActiveObjects();
    if(active.length){
      active.forEach(o=>fabricCanvas.remove(o));
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    }
  };

  document.addEventListener('keydown', e=>{
    if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    if(e.key==='Escape'){
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject(o=>o.selectable=true);
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    } else if(e.key==='Delete'||e.key==='Backspace'){
      const active = fabricCanvas.getActiveObjects();
      if(active.length){
        active.forEach(o=>fabricCanvas.remove(o));
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
      }
    }
  });
}
