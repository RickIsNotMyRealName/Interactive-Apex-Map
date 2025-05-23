import { cacheDom } from './dom.js';
import { initState } from './state.js';
import { loadDefaultList, loadDefaultEntityTypes, attachLoadHandlers } from './loaders.js';
import { buildAllUI } from './ui-builder.js';
import { setupPan } from './pan.js';
import { bindToolbar } from './toolbar.js';
import { bindTooltip } from './tooltip.js';
import { startRenderLoop } from './render.js';

window.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    initState();
    loadDefaultList();
    loadDefaultEntityTypes();
    attachLoadHandlers();
    buildAllUI();
    setupPan();
    bindToolbar();
    bindTooltip();
    startRenderLoop();
});
