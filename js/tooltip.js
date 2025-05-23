import { getElem } from './dom.js';
import { state } from './state.js';

export function bindTooltip() {
    const mapCanvas = getElem('mapCanvas');
    const tooltip = getElem('tooltip');

    mapCanvas.addEventListener('mousemove', e => {
        const mx = e.offsetX, my = e.offsetY;
        const cX = (mx - state.transform.offsetX) / state.transform.scale;
        const cY = (my - state.transform.offsetY) / state.transform.scale;
        let found = null;
        const r = 5 / state.transform.scale;

        outer: for (const item of state.entData) {
            if (!item.enabled) continue;
            for (const ent of item.ents) {
                if (state.propertyKeys.some(k => {
                    if (state.filters[k].size === 0 && !state.missingFilters[k]) return false;
                    const v = ent.props[k];
                    if (v !== undefined && v !== '') return !state.filters[k].has(v);
                    return !state.missingFilters[k];
                })) continue;
                if (state.hideOutOfRange && (ent.h < state.heightMin || ent.h > state.heightMax)) continue;
                const { cx, cy } = (() => {
                    const W = state.worldBounds;
                    const px = (ent.x - W.minX) / (W.maxX - W.minX) * mapCanvas.width;
                    const py = mapCanvas.height - ((ent.y - W.minY) / (W.maxY - W.minY) * mapCanvas.height);
                    return { cx: px, cy: py };
                })();
                if ((cX - cx) ** 2 + (cY - cy) ** 2 < r * r) {
                    found = ent;
                    break outer;
                }
            }
        }

        if (found) {
            tooltip.style.display = 'block';
            tooltip.style.left = (mx + 10) + 'px';
            tooltip.style.top = (my + 10) + 'px';
            tooltip.innerHTML = Object.entries(found.props)
                .map(([k, v]) => `<strong>${k}</strong>: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                .join('<br>');
        } else {
            tooltip.style.display = 'none';
        }
    });
}
