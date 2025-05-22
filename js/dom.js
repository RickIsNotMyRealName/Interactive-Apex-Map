// js/dom.js
const elems = {};

export const $ = id => document.getElementById(id);

export function cacheDom() {
  // sidebar + map elements
  elems.defaultMapSelect    = $('defaultMapSelect');
  elems.customJsonContainer = $('customJsonContainer');
  elems.combinedInput       = $('combinedInput');
  elems.etConfigInput       = $('etConfigInput');
  elems.entityTypes         = $('entityTypes');
  elems.filters             = $('filters');
  elems.legend              = $('legend');
  elems.mapCanvas           = $('mapCanvas');
  elems.drawingCanvas       = $('drawingCanvas');
  elems.heightMinInput      = $('heightMinInput');
  elems.heightMaxInput      = $('heightMaxInput');
  elems.hideOutCB           = $('hideOutCB');
  elems.heightLegend        = $('heightLegend');
  elems.tooltip             = $('tooltip');

  // toolbar container (if you ever need it)
  elems.toolbar             = document.querySelector('#toolbar');

  // **all** toolbar buttons & inputs
  elems.selectBtn           = $('selectBtn');
  elems.rectBtn             = $('rectBtn');
  elems.circleBtn           = $('circleBtn');
  elems.ellipseBtn          = $('ellipseBtn');
  elems.pencilBtn           = $('pencilBtn');
  elems.textBtn             = $('textBtn');
  elems.arrowBtn            = $('arrowBtn');
  elems.imageInput          = $('imageInput');
  elems.groupBtn            = $('groupBtn');
  elems.ungroupBtn          = $('ungroupBtn');
  elems.bringForwardBtn     = $('bringForwardBtn');
  elems.sendBackwardBtn     = $('sendBackwardBtn');
  elems.deleteBtn           = $('deleteBtn');
}

export function getElem(name) {
  return elems[name];
}
