// ── UI overlay: delay legend, hover tooltip, pinned inspection pane ────

import { CONFIG } from './config.js';
import { journeyView } from './journey.js';
import { stationById } from './stations.js';

const C = CONFIG.COLORS;
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function stationName(id) {
  return stationById.get(id)?.name ?? id ?? '—';
}

export class UI {
  constructor() {
    this._buildLegend();
    this._buildTooltip();
    this._buildPane();
    this.pinnedId = null;
  }

  _buildLegend() {
    const el = document.createElement('div');
    el.id = 'legend';
    const items = [
      [C.trainOnTime, 'On time'],
      [C.trainMinorDelay, `Delay ${CONFIG.DELAY_MINOR_MIN}–${CONFIG.DELAY_MAJOR_MIN - 1} min`],
      [C.trainMajorDelay, `Delay ≥ ${CONFIG.DELAY_MAJOR_MIN} min`],
      [C.trainStale, 'Stale / uncertain'],
    ];
    el.innerHTML = `<div class="title">Delay status</div>` +
      items.map(([c, label]) =>
        `<div class="item"><span class="swatch" style="background:${hex(c)}"></span>${label}</div>`
      ).join('');
    document.getElementById('app').appendChild(el);
  }

  _buildTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'tooltip';
    document.getElementById('app').appendChild(this.tooltip);
  }

  _buildPane() {
    this.pane = document.createElement('div');
    this.pane.id = 'pane';
    document.getElementById('app').appendChild(this.pane);
  }

  /** Bottom-right map controls + a one-line interaction hint. */
  buildMapControls({ onZoomIn, onZoomOut, onFit }) {
    const controls = document.createElement('div');
    controls.id = 'controls';
    const button = (label, title, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', fn);
      controls.appendChild(b);
    };
    button('+', 'zoom in', onZoomIn);
    button('−', 'zoom out', onZoomOut);
    button('⌂', 'fit Italy', onFit);
    document.getElementById('app').appendChild(controls);

    const hint = document.createElement('div');
    hint.id = 'hint';
    hint.textContent = 'drag to pan · scroll to zoom · click a train to inspect';
    document.getElementById('app').appendChild(hint);
  }

  /** Hover tooltip. t = train state, x/y = client pixels. */
  showTooltip(t, x, y) {
    const delayCls = t.delayMin >= CONFIG.DELAY_MAJOR_MIN ? 'var(--red)'
      : t.delayMin >= CONFIG.DELAY_MINOR_MIN ? 'var(--amber)' : 'var(--green)';
    const j = journeyView(t);
    this.tooltip.innerHTML = `
      <div class="tt-num" style="color:${delayCls}">${t.number}</div>
      <div class="tt-row"><span class="tt-dim">type</span><span>${t.type}</span></div>
      <div class="tt-row"><span class="tt-dim">route</span><span>${stationName(j.origin)} → ${stationName(j.destination)}</span></div>
      <div class="tt-row"><span class="tt-dim">delay</span><span style="color:${delayCls}">${t.delayMin} min</span></div>
      <div class="tt-row"><span class="tt-dim">last seen</span><span>${stationName(j.lastStation)}</span></div>
      <div class="tt-row"><span class="tt-dim">next</span><span>${j.atTerminus ? 'turnaround' : stationName(j.nextStation)}</span></div>
      <div class="tt-row"><span class="tt-dim">data age</span><span>${Math.round((performance.now() - t.lastSample) / 1000)}s</span></div>
    `;
    this.tooltip.style.display = 'block';
    const pad = 16;
    const w = this.tooltip.offsetWidth, h = this.tooltip.offsetHeight;
    let left = x + pad, top = y + pad;
    if (left + w > window.innerWidth) left = x - w - pad;
    if (top + h > window.innerHeight) top = y - h - pad;
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  pin(t) {
    this.pinnedId = t.id;
    this.pane.style.display = 'block';
    this.updatePane(t);
  }

  unpin() {
    if (this.pinnedId === null) return;
    this.pinnedId = null;
    this.pane.style.display = 'none';
    this.onUnpin?.();
  }

  /** Refresh the pinned pane with live data (called every frame if pinned). */
  updatePane(t) {
    if (!t) return;
    const delayCls = t.delayMin >= CONFIG.DELAY_MAJOR_MIN ? 'var(--red)'
      : t.delayMin >= CONFIG.DELAY_MINOR_MIN ? 'var(--amber)' : 'var(--green)';
    const age = Math.round((performance.now() - t.lastSample) / 1000);
    const j = journeyView(t);
    const progress = t.totalKm ? Math.round((j.legKm / t.totalKm) * 100) : 0;
    const status = j.atTerminus ? `turnaround at ${stationName(j.lastStation)}` : t.status;
    this.pane.innerHTML = `
      <div class="pane-head">
        <span class="pane-num" style="color:${delayCls}">${t.number}</span>
        <span class="pane-close" title="close">✕</span>
      </div>
      <div class="pane-row"><span class="k">category</span><span>${t.type}</span></div>
      <div class="pane-row"><span class="k">origin</span><span>${stationName(j.origin)}</span></div>
      <div class="pane-row"><span class="k">destination</span><span>${stationName(j.destination)}</span></div>
      <div class="pane-row"><span class="k">delay</span><span class="badge" style="background:${delayCls};color:#04070c">${t.delayMin} min</span></div>
      <div class="pane-row"><span class="k">last station</span><span>${stationName(j.lastStation)}</span></div>
      <div class="pane-row"><span class="k">next station</span><span>${j.atTerminus ? '—' : stationName(j.nextStation)}</span></div>
      <div class="pane-row"><span class="k">speed</span><span>${t.speedKmh} km/h</span></div>
      <div class="pane-row"><span class="k">journey</span><span>${progress}% of ${Math.round(t.totalKm)} km</span></div>
      <div class="pane-row"><span class="k">data age</span><span style="color:${age > 60 ? 'var(--red)' : 'inherit'}">${age}s ago</span></div>
      <div class="pane-row"><span class="k">status</span><span>${status}</span></div>
    `;
    this.pane.querySelector('.pane-close').onclick = () => this.unpin();
  }
}
