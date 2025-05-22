import { state } from './state.js';
import { requestRedraw } from './render.js';

// ① Enable per-pixel hit‐testing so only non-transparent pixels count
fabric.Object.prototype.perPixelTargetFind   = true;

// ② How many pixels around a non-transparent pixel still count as “hit”
//    (0 = exact, increase if you want a little “fuzz”)
fabric.Object.prototype.targetFindTolerance = 100;

// 1️⃣ Keep your stroke-width exactly the same no matter how the object is scaled:
fabric.Object.prototype.strokeUniform = true;

// 2️⃣ Lock all scaling to be uniform (so dragging any handle scales X and Y together):
fabric.Object.prototype.lockUniScaling = true;

export const fabricCanvas = new fabric.Canvas('drawingCanvas', {
  selection: true,
  preserveObjectStacking: true
});

export function setupPan() {
  const el = fabricCanvas.upperCanvasEl;
  el.style.cursor = 'grab';

  el.addEventListener('wheel', e => {
    if (fabricCanvas.isDrawingMode) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const zoom   = fabricCanvas.getZoom() * factor;
    fabricCanvas.zoomToPoint(
      new fabric.Point(e.offsetX, e.offsetY),
      zoom
    );
    syncTransform();
    requestRedraw();
  }, { passive: false });

  let isDragging = false;
  el.addEventListener('mousedown', e => {
    if (fabricCanvas.isDrawingMode) return;
    if (fabricCanvas.findTarget(e)) return;
    isDragging = true;
    el.style.cursor = 'grabbing';
  });

  el.addEventListener('mousemove', e => {
    if (fabricCanvas.isDrawingMode || !isDragging) return;
    fabricCanvas.relativePan(new fabric.Point(e.movementX, e.movementY));
    syncTransform();
    requestRedraw();
  });

  ['mouseup','mouseleave'].forEach(evt=>{
    el.addEventListener(evt, ()=>{
      isDragging = false;
      el.style.cursor = 'grab';
    });
  });
}

function syncTransform() {
  const vpt = fabricCanvas.viewportTransform;
  state.transform.scale   = vpt[0];
  state.transform.offsetX = vpt[4];
  state.transform.offsetY = vpt[5];
}
