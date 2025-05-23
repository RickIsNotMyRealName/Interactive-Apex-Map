// js/shape-info.js
import { getElem } from './dom.js';
import { state } from './state.js';
import { fabricCanvas } from './pan.js';

/* ──────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

/** Inverse of worldToCanvas (render.js) for a single pixel point. */
function canvasPxToWorld(cx, cy) {
    const mapCanvas = getElem('mapCanvas');
    const W = state.worldBounds;

    // horizontal: linear map canvas-px → world-x
    const x = W.minX + (cx / mapCanvas.width) * (W.maxX - W.minX);

    // vertical: remember world Y increases upward while canvas increases downward
    const y = W.minY + ((mapCanvas.height - cy) / mapCanvas.height) * (W.maxY - W.minY);

    return { x, y };
}

/** Show formatted data inside the floating panel. */
function renderInfo(obj) {
    const infoEl = getElem('shapeInfo');

    if (!obj) { infoEl.innerHTML = ''; return; }

    /* ---------- world-unit scale factors (world units per canvas-px) ---------- */
    const mapCanvas = getElem('mapCanvas');
    const W      = state.worldBounds;
    const pxToWorldX = (W.maxX - W.minX) / mapCanvas.width;
    const pxToWorldY = (W.maxY - W.minY) / mapCanvas.height;

    /* ---------- Origin (object centre in world units) ---------- */
    // Fabric gives object coordinates *before* viewport transform, which
    // matches what worldToCanvas expects, so we can convert directly.
    const cPt   = obj.getCenterPoint();
    const world = canvasPxToWorld(cPt.x, cPt.y);

    const rows  = [
        `<strong>Origin</strong>: (${world.x.toFixed(2)}, ${world.y.toFixed(2)})`
    ];

    /* ---------- Size metrics per object type ---------- */
    switch (obj.type) {
        case 'circle': {
            const rCanvas   = obj.radius * obj.scaleX;     // radius in canvas-px before viewport
            const rWorld    = rCanvas * pxToWorldX;        // assume square pixels
            rows.push(`<strong>Radius</strong>: ${rWorld.toFixed(2)}`);
            break;
        }

        case 'rect': {
            const wWorld = obj.getScaledWidth()  * pxToWorldX;
            const hWorld = obj.getScaledHeight() * pxToWorldY;
            rows.push(`<strong>Width</strong>:  ${wWorld.toFixed(2)}`);
            rows.push(`<strong>Height</strong>: ${hWorld.toFixed(2)}`);
            break;
        }

        case 'ellipse': {
            const rxWorld = obj.rx * obj.scaleX * pxToWorldX;
            const ryWorld = obj.ry * obj.scaleY * pxToWorldY;
            rows.push(`<strong>Radius&nbsp;X</strong>: ${rxWorld.toFixed(2)}`);
            rows.push(`<strong>Radius&nbsp;Y</strong>: ${ryWorld.toFixed(2)}`);
            break;
        }

        case 'line': {
            const p1 = canvasPxToWorld(obj.x1, obj.y1);
            const p2 = canvasPxToWorld(obj.x2, obj.y2);
            const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            rows.push(`<strong>Length</strong>: ${len.toFixed(2)}`);
            break;
        }

        default: { /* fallback (groups, images, etc.) */
            const wWorld = obj.getScaledWidth()  * pxToWorldX;
            const hWorld = obj.getScaledHeight() * pxToWorldY;
            rows.push(`<strong>Width</strong>:  ${wWorld.toFixed(2)}`);
            rows.push(`<strong>Height</strong>: ${hWorld.toFixed(2)}`);
        }
    }

    infoEl.innerHTML = rows.join('<br>');
}

/* ──────────────────────────────────────────────────────────────
   Public binder
   ──────────────────────────────────────────────────────────── */
export function bindShapeInfo() {
    // Show info when the active selection changes
    fabricCanvas.on('selection:created', e => renderInfo(e.selected[0]));
    fabricCanvas.on('selection:updated', e => renderInfo(e.selected[0]));
    fabricCanvas.on('selection:cleared', () => renderInfo(null));

    // Live-update while the object is manipulated
    ['object:moving', 'object:scaling', 'object:rotating', 'object:modified']
        .forEach(evt => fabricCanvas.on(evt, () => renderInfo(fabricCanvas.getActiveObject())));
}
