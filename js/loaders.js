import { getElem } from './dom.js';
import { state } from './state.js';
import { createTintedIcon } from './utils.js';
import {
  buildEntityTypes,
  buildLegend,
  buildFilters,
  buildZipCache,
  rebuildHeightLegend
} from './ui-builder.js';
import { requestRedraw, resizeCanvases } from './render.js';

/*───────────────────────────────────────────────────────────────────────────*\
  PRE-PROCESS ENTITY-TYPE CONFIG
  • Adds support for a new parent entry whose `renderType` is "list".
    The parent doesn’t render anything; its `list` array contains
    normal entity-type objects that *do* render.
  • We flatten the structure so the rest of the code can keep treating
    `state.entityTypeConfig` as a simple array.
\*───────────────────────────────────────────────────────────────────────────*/
function preprocessEntityTypes(raw) {
  const cfgs   = [];
  const checks = [];

  raw.forEach(item => {
    /*──────── parent / group entry ────────*/
    if (item.renderType === 'list' && Array.isArray(item.list)) {
      const groupIdx = cfgs.length;

      const grpEnabled = item.defaultEnabled ?? false;   // ← respect flag
      cfgs.push({ ...item, isGroup: true });
      checks.push(grpEnabled);                           // ← store state

      /* inherit parent default if child doesn’t specify its own */
      const inherited = grpEnabled;

      item.list.forEach(sub => {
        cfgs.push({ ...sub, parentGroup: groupIdx });
        checks.push(sub.defaultEnabled ?? inherited);
      });
    }
    /*──────── normal entry ────────────────*/
    else {
      cfgs.push(item);
      checks.push(!!item.defaultEnabled);
    }
  });

  return { cfgs, checks };
}

const STORAGE_KEY = 'lastMapSelection';

/*───────────────────────────────────────────────────────────────────────────*/
export async function loadDefaultList() {
  const sel = getElem('defaultMapSelect');
  try {
    const res = await fetch('./maps/manifest.json');
    if (!res.ok) throw new Error(res.statusText);
    const list = await res.json();

    sel.innerHTML = '<option value="">– Select –</option>';
    list.forEach(({ name, file }) =>
      sel.append(new Option(name, `./maps/${file}`))
    );
    sel.append(new Option('Load custom JSON…', '__custom'));

    const last = localStorage.getItem(STORAGE_KEY);
    if (last && [...sel.options].some(o => o.value === last)) {
      sel.value = last;
      if (last === '__custom') getElem('customJsonContainer').style.display = 'block';
      sel.dispatchEvent(new Event('change'));
    }
  } catch (err) {
    console.warn('Could not load map manifest:', err);
  }
}

/*───────────────────────────────────────────────────────────────────────────*/
export async function loadDefaultEntityTypes() {
  try {
    const res = await fetch('./entityTypes/entity-types.json');
    if (!res.ok) throw new Error(res.statusText);
    const raw = await res.json();
    const { cfgs, checks } = preprocessEntityTypes(raw);

    state.entityTypeConfig  = cfgs;
    state.entityTypeFilters = checks;

    Object.keys(state.iconCache).forEach(k => delete state.iconCache[k]);
    Object.keys(state.tintedIconCache).forEach(k => delete state.tintedIconCache[k]);

    cfgs.forEach((c, i) => {
      if (c.isGroup) return;
      if (c.renderType === 'icon' && c.icon) {
        const img = new Image();
        img.src = c.icon;
        state.iconCache[i] = img;
        img.onload = () => {
          if (c.tintColor) {
            state.tintedIconCache[i] = createTintedIcon(img, c.tintColor);
            requestRedraw();
          }
        };
      }
    });

    buildEntityTypes();
  } catch (err) {
    console.warn('Could not load entity types:', err);
  }
}

/*───────────────────────────────────────────────────────────────────────────*/
export function handleCombinedData(data, sourceName) {
  const img = new Image();
  img.onload = () => {
    state.transform.scale = 1;
    state.transform.offsetX = 0;
    state.transform.offsetY = 0;
    resizeCanvases();
  };
  img.src = 'data:image/png;base64,' + data.background_image;
  state.mapImage = img;

  const cfg = data.config;
  state.mapDef = { posX: +cfg.pos_x, posY: +cfg.pos_y, scale: +cfg.scale };

  const raw = Array.isArray(data.entities) ? data.entities : [];
  let mn = Infinity, mx = -Infinity;
  const ents = raw
    .filter(e => typeof e.origin === 'string')
    .map(e => {
      const props = { ...e };
      const [x, y, z = 0] = e.origin.split(/\s+/).map(Number);
      props.x = x;
      props.y = y;
      props.height = z;
      mn = Math.min(mn, z);
      mx = Math.max(mx, z);
      return { x, y, h: z, props };
    });

  state.heightMin = Math.floor(mn);
  state.heightMax = Math.ceil(mx);
  getElem('heightMinInput').value = state.heightMin;
  getElem('heightMaxInput').value = state.heightMax;
  rebuildHeightLegend();

  state.entData = [{ ents, color: '#e6194b', fileName: sourceName, enabled: true }];
  buildLegend();
  buildFilters();
  buildZipCache();
  requestRedraw();
}

/*───────────────────────────────────────────────────────────────────────────*/
export function attachLoadHandlers() {
  const sel     = getElem('defaultMapSelect');
  const customC = getElem('customJsonContainer');
  const comb    = getElem('combinedInput');
  const et      = getElem('etConfigInput');

  /* map picker ───────────────────────────────────────────────*/
  sel.addEventListener('change', async e => {
    const v = e.target.value;
    localStorage.setItem(STORAGE_KEY, v);

    if (v === '__custom') {
      customC.style.display = 'block';
      return;
    }
    customC.style.display = 'none';
    if (!v) return;

    try {
      const txt = await fetch(v).then(r => r.ok ? r.text() : Promise.reject(r.status));
      handleCombinedData(JSON.parse(txt), v.split('/').pop());
    } catch (err) {
      alert('Could not load map: ' + err);
    }
  });

  /* custom JSON map ──────────────────────────────────────────*/
  comb.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    localStorage.setItem(STORAGE_KEY, '__custom');
    const r = new FileReader();
    r.onload = () => {
      try { handleCombinedData(JSON.parse(r.result), f.name); }
      catch (err) { alert('Invalid JSON: ' + err); }
    };
    r.readAsText(f);
  });

  /* override entity-type config ──────────────────────────────*/
  et.addEventListener('click', () => (et.value = ''));
  et.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const raw = JSON.parse(r.result);
        const { cfgs, checks } = preprocessEntityTypes(raw);
        state.entityTypeConfig  = cfgs;
        state.entityTypeFilters = checks;

        Object.keys(state.iconCache).forEach(k => delete state.iconCache[k]);
        Object.keys(state.tintedIconCache).forEach(k => delete state.tintedIconCache[k]);

        cfgs.forEach((c, i) => {
          if (c.isGroup) return;
          if (c.renderType === 'icon' && c.icon) {
            const img = new Image();
            img.src = c.icon;
            state.iconCache[i] = img;
            img.onload = () => {
              if (c.tintColor) state.tintedIconCache[i] = createTintedIcon(img, c.tintColor);
              requestRedraw();
            };
          }
        });

        buildEntityTypes();
        requestRedraw();
      } catch (err) {
        alert('Invalid JSON: ' + err);
      }
    };
    r.readAsText(f);
  });
}
