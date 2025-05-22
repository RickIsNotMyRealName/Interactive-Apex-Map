import { state } from './state.js';
import { getElem } from './dom.js';

export function createTintedIcon(img, tintColor) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, w, h);
  octx.globalCompositeOperation = 'screen';
  octx.fillStyle = tintColor;
  octx.fillRect(0, 0, w, h);
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(img, 0, 0, w, h);
  octx.globalCompositeOperation = 'source-over';
  return off;
}

export function heightToColour(h) {
  const { heightMin, heightMax, belowClr, aboveClr } = state;
  if (h < heightMin) return belowClr;
  if (h > heightMax) return aboveClr;
  const t = (h - heightMin) / (heightMax - heightMin);
  const hue = 240 * (1 - t);
  return `hsl(${hue},100%,50%)`;
}

export function getViewportCenter() {
  const { scale, offsetX, offsetY } = state.transform;
  const canvas = getElem('drawingCanvas');
  const w = canvas.width;
  const h = canvas.height;
  return {
    x: (w/2 - offsetX)/scale,
    y: (h/2 - offsetY)/scale
  };
}
