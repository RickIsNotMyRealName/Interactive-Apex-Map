import { state } from './state.js';
import { requestRedraw } from './render.js';

// ① Enable per-pixel hit‐testing so only non-transparent pixels count
fabric.Object.prototype.perPixelTargetFind = true;

// ② How many pixels around a non-transparent pixel still count as “hit”
//    (0 = exact, increase if you want a little “fuzz”)
fabric.Object.prototype.targetFindTolerance = 100;

// 1️⃣ Keep your stroke-width exactly the same no matter how the object is scaled:
fabric.Object.prototype.strokeUniform = true;

// 2️⃣ Lock all scaling to be uniform (so dragging any handle scales X and Y together):
fabric.Object.prototype.lockUniScaling = true;

function drawRadiusControl(ctx, left, top, styleOverride, fabricObject) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(left, top, 7, 0, 2 * Math.PI);
    ctx.globalAlpha = 0;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#b2ccff';
    ctx.globalAlpha = 1.0;
    ctx.stroke();
    ctx.restore();
}

// Custom control for resizing radius
const radiusControl = new fabric.Control({
    x: 0.5, // right side
    y: 0,
    offsetX: 0,
    offsetY: 0,
    cursorStyle: 'ew-resize',
    mouseUpHandler: function (eventData, transform) {
        // Optionally, snap radius or do post-processing here
        return true;
    },
    mouseDownHandler: function (eventData, transform) {
        // Store initial values if needed
        return true;
    },
    actionHandler: function (eventData, transform) {
        const target = transform.target;
        const canvas = target.canvas;
        const center = target.getCenterPoint();
        const pointer = canvas.getPointer(eventData.e);
        const dx = pointer.x - center.x;
        const dy = pointer.y - center.y;
        let newRadius = Math.sqrt(dx * dx + dy * dy);
        newRadius = Math.max(newRadius, 5);

        target.set({ radius: newRadius });
        target.setCoords();

        // 🚀 force an immediate redraw:
        canvas.requestRenderAll();

        return true;
    },
    render: drawRadiusControl,
    cornerSize: 16
});

// Attach the custom control to circles only
fabric.Circle.prototype.controls = {
    radius: radiusControl
};

// Draw a tiny center-dot on every Circle
fabric.Circle.prototype._render = (function (origRender) {
    return function (ctx) {
        origRender.call(this, ctx);
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 0.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    };
})(fabric.Circle.prototype._render);



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
        const zoom = fabricCanvas.getZoom() * factor;
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

    ['mouseup', 'mouseleave'].forEach(evt => {
        el.addEventListener(evt, () => {
            isDragging = false;
            el.style.cursor = 'grab';
        });
    });
}

function syncTransform() {
    const vpt = fabricCanvas.viewportTransform;
    state.transform.scale = vpt[0];
    state.transform.offsetX = vpt[4];
    state.transform.offsetY = vpt[5];
}
