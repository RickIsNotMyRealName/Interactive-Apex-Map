// js/shape-info.js
import { getElem }    from './dom.js';
import { state }      from './state.js';
import { fabricCanvas } from './pan.js';

const METER_FACTOR = 0.0254;  // 1 hammer unit = 0.0254 metres

/**
 * Canvas‐px → world coord
 */
function canvasPxToWorld(cx, cy, W, mapCanvas) {
  const rangeX = W.maxX - W.minX;
  const rangeY = W.maxY - W.minY;
  const x = W.minX + (cx / mapCanvas.width) * rangeX;
  const y = W.minY + ((mapCanvas.height - cy) / mapCanvas.height) * rangeY;
  return { x, y };
}

/**
 * World ↔ display conversion based on unit
 */
function worldToDisplay(worldVal, dim, type, unit, ctx) {
  const { W, mapCanvas, px2wx, px2wy, rangeX, rangeY } = ctx;
  switch (unit) {
    case 'meters':
      return worldVal * METER_FACTOR;
    case 'canvas':
      if (type === 'coord') {
        if (dim === 'x') {
          return (worldVal - W.minX) / rangeX * mapCanvas.width;
        } else {
          return mapCanvas.height - ((worldVal - W.minY) / rangeY) * mapCanvas.height;
        }
      } else {
        return dim === 'x' ? worldVal / px2wx : worldVal / px2wy;
      }
    default: // hammer
      return worldVal;
  }
}
function displayToWorld(displayVal, dim, type, unit, ctx) {
  const { W, mapCanvas, px2wx, px2wy, rangeX, rangeY } = ctx;
  switch (unit) {
    case 'meters':
      return displayVal / METER_FACTOR;
    case 'canvas':
      if (type === 'coord') {
        if (dim === 'x') {
          return W.minX + (displayVal / mapCanvas.width) * rangeX;
        } else {
          return W.minY + ((mapCanvas.height - displayVal) / mapCanvas.height) * rangeY;
        }
      } else {
        return dim === 'x' ? displayVal * px2wx : displayVal * px2wy;
      }
    default: // hammer
      return displayVal;
  }
}

/**
 * Create a unit‐selector with given default
 */
function makeUnitSelect(onChange, defaultUnit = 'hammer') {
  const sel = document.createElement('select');
  sel.className = 'shape-unit-select';
  ['hammer','meters','canvas'].forEach(u => {
    const o = document.createElement('option');
    o.value = u;
    o.textContent = u;
    sel.append(o);
  });
  sel.value = defaultUnit;
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}

/**
 * Add one editable row: label + number input + its own unit dropdown.
 *
 * @param defaultUnit  'hammer' or 'meters' or 'canvas'
 */
function addField(container, labelText, getWorld, dim, type, applyWorld, ctx, defaultUnit = 'hammer') {
  const row = document.createElement('div');
  row.className = 'shape-info-row';

  const lbl = document.createElement('label');
  lbl.textContent = labelText;

  const inp = document.createElement('input');
  inp.type = 'number';
  inp.step = 'any';

  // update the input display from world value
  function updateDisplay(unit) {
    const w = getWorld();
    inp.value = worldToDisplay(w, dim, type, unit, ctx).toFixed(2);
  }

  // initialize
  updateDisplay(defaultUnit);

  const sel = makeUnitSelect(u => updateDisplay(u), defaultUnit);

  if (applyWorld) {
    inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      if (!Number.isNaN(v)) {
        const unit = sel.value;
        const worldVal = displayToWorld(v, dim, type, unit, ctx);
        applyWorld(worldVal);
      }
    });
  } else {
    inp.disabled = true;
  }

  row.append(lbl, inp, sel);
  container.append(row);
}

// currently selected object
let currentObj = null;

export function bindShapeInfo() {
  const panel = getElem('shapeInfo');
  // keep clicks in panel from deselecting shapes
  ['pointerdown','mousedown'].forEach(e =>
    panel.addEventListener(e, ev => ev.stopPropagation())
  );

  function render(obj) {
    currentObj = obj;
    const infoEl = panel;
    infoEl.innerHTML = '';
    if (!obj) return;

    const mapCanvas = getElem('mapCanvas');
    const W         = state.worldBounds;
    const rangeX    = W.maxX - W.minX;
    const rangeY    = W.maxY - W.minY;
    const px2wx     = rangeX / mapCanvas.width;
    const px2wy     = rangeY / mapCanvas.height;
    const ctx       = { W, mapCanvas, px2wx, px2wy, rangeX, rangeY };

    // getters for object centre in world coords
    const getCtr = () => obj.getCenterPoint();
    const getWorldX = () =>
      W.minX + (getCtr().x / mapCanvas.width) * rangeX;
    const getWorldY = () =>
      W.minY + ((mapCanvas.height - getCtr().y) / mapCanvas.height) * rangeY;

    // Origin X & Y (default hammer)
    addField(infoEl, 'Origin X', getWorldX, 'x', 'coord',
      newWX => {
        const cx = (newWX - W.minX) / rangeX * mapCanvas.width;
        obj.set('left', cx);
        obj.setCoords();
        fabricCanvas.requestRenderAll();
      }, ctx, 'hammer');

    addField(infoEl, 'Origin Y', getWorldY, 'y', 'coord',
      newWY => {
        const cy = mapCanvas.height - ((newWY - W.minY) / rangeY) * mapCanvas.height;
        obj.set('top', cy);
        obj.setCoords();
        fabricCanvas.requestRenderAll();
      }, ctx, 'hammer');

    // size‐specific
    switch (obj.type) {
      case 'circle': {
        const getR = () => obj.radius * obj.scaleX * px2wx;
        addField(infoEl, 'Radius', getR, 'x', 'length',
          newR => {
            const px = newR / px2wx;
            obj.set('radius', px / obj.scaleX);
            obj.setCoords();
            fabricCanvas.requestRenderAll();
          }, ctx, 'meters');  // <-- default to meters
        break;
      }
      case 'rect': {
        const getW = () => obj.getScaledWidth() * px2wx;
        const getH = () => obj.getScaledHeight() * px2wy;
        addField(infoEl, 'Width', getW, 'x', 'length',
          newW => {
            const px = newW / px2wx;
            obj.set('width', px / obj.scaleX);
            obj.setCoords();
            fabricCanvas.requestRenderAll();
          }, ctx, 'hammer');
        addField(infoEl, 'Height', getH, 'y', 'length',
          newH => {
            const px = newH / px2wy;
            obj.set('height', px / obj.scaleY);
            obj.setCoords();
            fabricCanvas.requestRenderAll();
          }, ctx, 'hammer');
        break;
      }
      case 'ellipse': {
        const getRX = () => obj.rx * obj.scaleX * px2wx;
        const getRY = () => obj.ry * obj.scaleY * px2wy;
        addField(infoEl, 'Radius X', getRX, 'x', 'length',
          newRX => {
            obj.set('rx', (newRX / px2wx) / obj.scaleX);
            obj.setCoords();
            fabricCanvas.requestRenderAll();
          }, ctx, 'hammer');
        addField(infoEl, 'Radius Y', getRY, 'y', 'length',
          newRY => {
            obj.set('ry', (newRY / px2wy) / obj.scaleY);
            obj.setCoords();
            fabricCanvas.requestRenderAll();
          }, ctx, 'hammer');
        break;
      }
      default: {
        const getW = () => obj.getScaledWidth() * px2wx;
        const getH = () => obj.getScaledHeight() * px2wy;
        addField(infoEl, 'Width', getW, 'x', 'length', null, ctx, 'hammer');
        addField(infoEl, 'Height', getH, 'y', 'length', null, ctx, 'hammer');
      }
    }
  }

  // hook selection and live‐update events
  fabricCanvas.on('selection:created',  e => render(e.selected[0]));
  fabricCanvas.on('selection:updated',  e => render(e.selected[0]));
  fabricCanvas.on('selection:cleared',      () => render(null));
  ['object:moving','object:scaling','object:rotating','object:modified']
    .forEach(evt => fabricCanvas.on(evt, () => currentObj && render(currentObj)));
}
