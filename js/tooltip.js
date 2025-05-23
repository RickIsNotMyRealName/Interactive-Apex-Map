import { getElem } from './dom.js';
import { state } from './state.js';
import { fabricCanvas } from './pan.js';

export function bindTooltip() {
    const mapCanvas = getElem('mapCanvas');
    const tooltip = getElem('tooltip');
    const upperEl = fabricCanvas.upperCanvasEl;

    upperEl.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });

    upperEl.addEventListener('mousemove', e => {
        const rect = upperEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let found = null;
        const R = 5;

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

                const W = state.worldBounds;
                const px = (ent.x - W.minX) / (W.maxX - W.minX) * mapCanvas.width;
                const py = mapCanvas.height - ((ent.y - W.minY) / (W.maxY - W.minY) * mapCanvas.height);

                const sx = px * state.transform.scale + state.transform.offsetX;
                const sy = py * state.transform.scale + state.transform.offsetY;

                if ((mx - sx) ** 2 + (my - sy) ** 2 <= R * R) {
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
                .map(([k, v]) =>
                    `<strong>${k}</strong>: ${typeof v === 'object' ? JSON.stringify(v) : v}`
                )
                .join('<br>');
        } else {
            tooltip.style.display = 'none';
        }
    });
}
