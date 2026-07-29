// ── UI overlay: delay legend, hover tooltip, pinned inspection pane ────

import { CONFIG } from './config.js';
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

  /** Hover tooltip. t = train state, x/y = client pixels. */
  showTooltip(t, x, y) {
    const delayCls = t.delayMin >= CONFIG.DELAY_MAJOR_MIN ? 'var(--red)'
      : t.delayMin >= CONFIG.DELAY_MINOR_MIN ? 'var(--amber)' : 'var(--green)';
    this.tooltip.innerHTML = `
      <div class="tt-num" style="color:${delayCls}">${t.number}</div>
      <div class="tt-row"><span class="tt-dim">type</span><span>${t.type}</span></div>
      <div class="tt-row"><span class="tt-dim">route</span><span>${stationName(t.origin)} → ${stationName(t.destination)}</span></div>
      <div class="tt-row"><span class="tt-dim">delay</span><span style="color:${delayCls}">${t.delayMin} min</span></div>
      <div class="tt-row"><span class="tt-dim">last seen</span><span>${stationName(t.lastStation)}</span></div>
      <div class="tt-row"><span class="tt-dim">next</span><span>${stationName(t.nextStation)}</span></div>
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
    this.pinnedId = null;
    this.pane.style.display = 'none';
  }

  /** Refresh the pinned pane with live data (called every frame if pinned). */
  updatePane(t) {
    if (!t) return;
    const delayCls = t.delayMin >= CONFIG.DELAY_MAJOR_MIN ? 'var(--red)'
      : t.delayMin >= CONFIG.DELAY_MINOR_MIN ? 'var(--amber)' : 'var(--green)';
    const age = Math.round((performance.now() - t.lastSample) / 1000);
    const progress = t.totalKm ? Math.round((t.progressKm / t.totalKm) * 100) : 0;
    this.pane.innerHTML = `
      <div class="pane-head">
        <span class="pane-num" style="color:${delayCls}">${t.number}</span>
        <span class="pane-close" title="close">✕</span>
      </div>
      <div class="pane-row"><span class="k">category</span><span>${t.type}</span></div>
      <div class="pane-row"><span class="k">origin</span><span>${stationName(t.origin)}</span></div>
      <div class="pane-row"><span class="k">destination</span><span>${stationName(t.destination)}</span></div>
      <div class="pane-row"><span class="k">delay</span><span class="badge" style="background:${delayCls};color:#04070c">${t.delayMin} min</span></div>
      <div class="pane-row"><span class="k">last station</span><span>${stationName(t.lastStation)}</span></div>
      <div class="pane-row"><span class="k">next station</span><span>${stationName(t.nextStation)}</span></div>
      <div class="pane-row"><span class="k">speed</span><span>${t.speedKmh} km/h</span></div>
      <div class="pane-row"><span class="k">journey</span><span>${progress}% of ${Math.round(t.totalKm)} km</span></div>
      <div class="pane-row"><span class="k">data age</span><span style="color:${age > 60 ? 'var(--red)' : 'inherit'}">${age}s ago</span></div>
      <div class="pane-row"><span class="k">status</span><span>${t.status}</span></div>
    `;
    this.pane.querySelector('.pane-close').onclick = () => this.unpin();
  }
}
