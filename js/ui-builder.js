import { getElem } from './dom.js';
import { state } from './state.js';
import { requestRedraw } from './render.js';
import { heightToColour } from './utils.js';

export function buildAllUI() {
    buildEntityTypes();
    buildLegend();
    buildFilters();
    buildZipCache();
    rebuildHeightLegend();
}

export function buildEntityTypes() {
    const panel = getElem('entityTypes');
    panel.innerHTML = '';

    /* map parent → children */
    const kidsByParent = {};
    state.entityTypeConfig.forEach((cfg, i) => {
        if (cfg.parentGroup !== undefined) (kidsByParent[cfg.parentGroup] ||= []).push(i);
    });

    /* refs to check-boxes */
    const checkRefs = [];

    /*── helper: update parent’s tri-state -─────────────*/
    function syncParentState(parentIdx) {
        const cbParent = checkRefs[parentIdx];
        if (!cbParent) return;

        const kids = kidsByParent[parentIdx] || [];

        /* consider only non-independent children */
        const depKids = kids.filter(k => !state.entityTypeConfig[k].independent);

        if (depKids.length === 0) return;               // nothing to sync

        const allOn = depKids.every(k => state.entityTypeFilters[k]);
        const allOff = depKids.every(k => !state.entityTypeFilters[k]);

        if (allOn) { cbParent.indeterminate = false; cbParent.checked = true; }
        else if (allOff) { cbParent.indeterminate = false; cbParent.checked = false; }
        else { cbParent.indeterminate = true; cbParent.checked = false; }
    }

    /*── row factory ─────────────────────────────────────*/
    function makeRow(cfg, idx, kind /* 'parent' | 'child' | 'solo' */) {
        const row = document.createElement('div');
        const label = document.createElement('label');

        const cb = Object.assign(document.createElement('input'), {
            type: 'checkbox',
            checked: state.entityTypeFilters[idx]
        });
        checkRefs[idx] = cb;

        /* visual tweaks */
        if (kind === 'parent') {
            label.style.fontWeight = 'bold';
            label.style.marginTop = '6px';
        } else if (kind === 'child') {
            label.style.marginLeft = '18px';
        }

        /* collapse / expand arrow */
        let arrow = null;
        if (kind === 'parent' && cfg.showChildren !== false && (kidsByParent[idx] || []).length) {
            const collapsedInit = cfg.collapsed === true;

            arrow = document.createElement('span');
            arrow.textContent = collapsedInit ? '▸' : '▾';
            arrow.dataset.collapsed = collapsedInit ? 'true' : 'false';
            arrow.style.cursor = 'pointer';
            arrow.style.marginRight = '4px';

            arrow.addEventListener('click', ev => {
                ev.stopPropagation();       // prevent label bubbling
                ev.preventDefault();        // prevent check-box toggle
                const collapsed = arrow.dataset.collapsed === 'true';
                arrow.dataset.collapsed = collapsed ? 'false' : 'true';
                arrow.textContent = collapsed ? '▾' : '▸';
                (kidsByParent[idx] || []).forEach(kid => {
                    const el = panel.querySelector(`[data-parent="${idx}"][data-row="${kid}"]`);
                    if (el) el.style.display = collapsed ? '' : 'none';
                });
            });

            label.append(arrow);
        }

        label.append(cb, ' ', cfg.nickname || '(unnamed)');
        row.append(label);
        row.dataset.row = idx;
        if (kind === 'child') row.dataset.parent = cfg.parentGroup;
        panel.append(row);

        /*── interactions ─────────────────────────────────*/
        if (cfg.isGroup) {                      /* parent */
            cb.addEventListener('change', () => {
                (kidsByParent[idx] || []).forEach(kid => {
                    const childCfg = state.entityTypeConfig[kid];
                    if (childCfg.independent) return;
                    state.entityTypeFilters[kid] = cb.checked;
                    const kidCb = checkRefs[kid];
                    if (kidCb) kidCb.checked = cb.checked;
                });
                requestRedraw();
            });
        } else {                                /* child / solo */
            cb.addEventListener('change', () => {
                state.entityTypeFilters[idx] = cb.checked;
                if (cfg.parentGroup !== undefined) syncParentState(cfg.parentGroup);
                requestRedraw();
            });
        }

        return row;
    }

    /*── build list preserving original order ───────────*/
    state.entityTypeConfig.forEach((cfg, i) => {
        if (cfg.isGroup) {
            const parentRow = makeRow(cfg, i, 'parent');

            /* children rows */
            const collapsedInit = cfg.collapsed === true;
            (kidsByParent[i] || []).forEach(kid => {
                const childCfg = state.entityTypeConfig[kid];
                if (cfg.showChildren !== false) {
                    const childRow = makeRow(childCfg, kid, 'child');
                    if (collapsedInit) childRow.style.display = 'none';
                } else {
                    checkRefs[kid] = null;
                }
            });

            /* final sync so parent shows correct state at load */
            syncParentState(i);
        }
        /* stand-alone row */
        else if (cfg.parentGroup === undefined) {
            makeRow(cfg, i, 'solo');
        }
    });
}



export function buildLegend() {
    const c = getElem('legend');
    c.innerHTML = '';
    state.entData.forEach(item => {
        const lbl = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = item.enabled;
        cb.onchange = () => { item.enabled = cb.checked; requestRedraw(); };
        const sw = document.createElement('span');
        sw.style.cssText =
            'width:14px;height:14px;display:inline-block;margin-right:8px;' +
            `border:1px solid #999;background:${item.color}`;
        lbl.append(cb, sw, item.fileName);
        c.append(lbl);
    });
}

export function buildFilters() {
    const { propertyKeys, entData } = state;
    state.filters = {}; state.missingFilters = {};
    propertyKeys.forEach(k => { state.filters[k] = new Set(); state.missingFilters[k] = false; });
    entData.forEach(d => d.ents.forEach(e => {
        propertyKeys.forEach(k => { if (e.props[k]) state.filters[k].add(e.props[k]); });
    }));
    const c = getElem('filters');
    c.innerHTML = '';
    propertyKeys.forEach(key => {
        const fg = document.createElement('div');
        fg.className = 'filter-group';
        fg.append(Object.assign(document.createElement('strong'), { textContent: key }));

        const allCB = document.createElement('input');
        allCB.type = 'checkbox';
        const allLbl = document.createElement('label');
        allLbl.append(allCB, ' All');
        allCB.onchange = () => {
            fg.querySelectorAll('input[data-val]').forEach(ch => {
                ch.checked = allCB.checked;
                ch.checked ? state.filters[key].add(ch.dataset.val) : state.filters[key].delete(ch.dataset.val);
            });
            requestRedraw();
        };
        fg.append(allLbl);

        const missCB = document.createElement('input');
        missCB.type = 'checkbox';
        const missLbl = document.createElement('label');
        missLbl.append(missCB, ' Missing');
        missCB.onchange = () => { state.missingFilters[key] = missCB.checked; requestRedraw(); };
        fg.append(missLbl);

        const search = document.createElement('input');
        search.type = 'text';
        search.placeholder = `Search ${key}`;
        search.oninput = () => {
            const t = search.value.toLowerCase();
            fg.querySelectorAll('label[data-val]').forEach(l => {
                l.style.display = l.textContent.toLowerCase().includes(t) ? 'block' : 'none';
            });
        };
        fg.append(search);

        Array.from(state.filters[key]).sort().forEach(v => {
            const lbl = document.createElement('label');
            lbl.dataset.val = v;
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.dataset.val = v;
            cb.onchange = () => { cb.checked ? state.filters[key].add(v) : state.filters[key].delete(v); requestRedraw(); };
            lbl.append(cb, ' ', v);
            fg.append(lbl);
        });

        c.append(fg);
    });
}

export function buildZipCache() {
    state.zipSegments = [];
    const tmp = {};
    state.entData.forEach(d => d.ents.forEach(e => {
        if (e.props.classname === 'zipline') tmp[e.props.link_guid] = { start: e, end: null };
    }));
    state.entData.forEach(d => d.ents.forEach(e => {
        if (e.props.classname === 'zipline_end' && tmp[e.props.link_guid]) tmp[e.props.link_guid].end = e;
    }));
    Object.values(tmp).forEach(z => {
        if (!z.start) return;
        const seg = [{ x: z.start.x, y: z.start.y }];
        Object.entries(z.start.props).forEach(([k, v]) => {
            const m = k.match(/_zipline_rest_point_(\d+)/);
            if (m) {
                const [rx, ry] = v.split(/\s+/).map(Number);
                seg.push({ idx: +m[1], x: rx, y: ry });
            }
        });
        seg.sort((a, b) => a.idx - b.idx);
        if (z.end) seg.push({ x: z.end.x, y: z.end.y });
        if (seg.length > 1) state.zipSegments.push(seg);
    });
}

export function rebuildHeightLegend() {
    const c = getElem('heightLegend');
    c.innerHTML = '';
    const grad = `linear-gradient(to right,
    ${state.belowClr} 0%,
    ${heightToColour(state.heightMin)} 0%,
    ${heightToColour(state.heightMax)} 100%,
    ${state.aboveClr} 100%)`;
    const bar = document.createElement('div');
    bar.style.cssText = `height:18px;background:${grad};border:1px solid #555;margin-bottom:4px`;
    c.append(bar);
    const lbl = document.createElement('div');
    lbl.style.cssText = 'display:flex;justify-content:space-between;font-size:0.75em;color:#aaa';
    lbl.innerHTML = `<span>&lt;${state.heightMin}</span><span>${state.heightMin}</span>
                   <span>${state.heightMax}</span><span>&gt;${state.heightMax}</span>`;
    c.append(lbl);
}
