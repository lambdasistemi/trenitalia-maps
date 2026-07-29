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

  /** Top-center search over stations and live trains.
   *  provider(query) → ranked results; onSelect(result) acts on the choice. */
  buildSearch({ provider, onSelect }) {
    const wrap = document.createElement('div');
    wrap.id = 'search';
    wrap.innerHTML = `
      <input id="search-input" type="text" placeholder="search station or train — /"
             autocomplete="off" spellcheck="false" />
      <div id="search-results"></div>`;
    document.getElementById('app').appendChild(wrap);
    const input = wrap.querySelector('#search-input');
    const list = wrap.querySelector('#search-results');
    let results = [], active = -1;

    const close = () => { list.style.display = 'none'; list.innerHTML = ''; results = []; active = -1; };
    const render = () => {
      if (!results.length) { close(); return; }
      list.style.display = 'block';
      list.innerHTML = results.map((r, i) => {
        const name = r.kind === 'station' ? r.ref.name : r.ref.number;
        const sub = r.kind === 'station' ? 'station' : (r.ref.type ?? 'train');
        return `<div class="search-item${i === active ? ' active' : ''}" data-i="${i}">
          <span class="search-kind">${r.kind === 'station' ? '⊙' : '➤'}</span>
          <span class="search-name">${name}</span>
          <span class="search-sub">${sub}</span></div>`;
      }).join('');
    };
    const choose = (i) => {
      const r = results[i];
      if (!r) return;
      close();
      input.value = '';
      input.blur();
      onSelect(r);
    };

    input.addEventListener('input', () => {
      results = provider(input.value);
      active = results.length ? 0 : -1;
      render();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, results.length - 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
      else if (e.key === 'Enter') choose(active);
      else if (e.key === 'Escape') { close(); input.value = ''; input.blur(); e.stopPropagation(); }
    });
    list.addEventListener('pointerdown', (e) => {
      const item = e.target.closest('.search-item');
      if (item) { e.preventDefault(); choose(+item.dataset.i); }
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        input.focus();
        input.select();   // typing replaces any leftover query
      }
    });
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
    hint.textContent = 'drag to pan · scroll to zoom · click a train to inspect · / to search';
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
