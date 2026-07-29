// ── Status HUD ─────────────────────────────────────────────────────────
// Default: a compact, user-facing card — sim clock, train counts by delay,
// one-line network state. The full engineering panel (budget sparkline,
// cache, scheduler, staleness) expands on click or the D key.

import { CONFIG } from './config.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class HUD {
  constructor() {
    this._el = document.createElement('div');
    this._el.id = 'hud';
    this._el.innerHTML = `
      <div id="hud-head">
        <h3>Trenitalia Live</h3>
        <span id="hud-clock">--:--</span>
      </div>
      <div id="hud-counts"></div>
      <div id="hud-netline">
        <span id="hud-net"></span>
        <button id="hud-toggle" title="toggle network details (D)">details ▾</button>
      </div>
      <div id="hud-debug"></div>
    `;
    document.getElementById('app').appendChild(this._el);

    this._debugEl = this._el.querySelector('#hud-debug');
    this._expanded = localStorage.getItem('tren.debug') === '1';
    this._applyExpanded();

    const toggle = () => {
      this._expanded = !this._expanded;
      localStorage.setItem('tren.debug', this._expanded ? '1' : '0');
      this._applyExpanded();
    };
    this._el.querySelector('#hud-toggle').addEventListener('click', toggle);
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'd' || e.key === 'D') toggle();
    });

    this._lastUpdate = 0;
  }

  _applyExpanded() {
    this._debugEl.style.display = this._expanded ? 'block' : 'none';
    this._el.querySelector('#hud-toggle').textContent =
      this._expanded ? 'details ▴' : 'details ▾';
  }

  update({ rateLimiter, cache, trainStore, scheduler, apiClient, simulator }) {
    // Throttle DOM updates to ~4fps
    const now = performance.now();
    if (now - this._lastUpdate < 250) return;
    this._lastUpdate = now;

    // ── Sim clock ──
    if (simulator?.clockHours) {
      const h = simulator.clockHours();
      const hh = String(Math.floor(h)).padStart(2, '0');
      const mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
      this._el.querySelector('#hud-clock').textContent = `${hh}:${mm}`;
    }

    // ── Train counts by delay class ──
    const C = CONFIG.COLORS;
    let onTime = 0, minor = 0, major = 0, stale = 0;
    for (const t of trainStore.all()) {
      if (now - t.lastSample > CONFIG.STALE_THRESHOLD_MS) stale++;
      else if (t.delayMin >= CONFIG.DELAY_MAJOR_MIN) major++;
      else if (t.delayMin >= CONFIG.DELAY_MINOR_MIN) minor++;
      else onTime++;
    }
    const count = (color, n, label) =>
      `<span class="hud-count" title="${label}"><span class="hud-dot" style="background:${hex(color)}"></span>${n}</span>`;
    this._el.querySelector('#hud-counts').innerHTML =
      count(C.trainOnTime, onTime, 'on time') +
      count(C.trainMinorDelay, minor, `delay ${CONFIG.DELAY_MINOR_MIN}–${CONFIG.DELAY_MAJOR_MIN - 1} min`) +
      count(C.trainMajorDelay, major, `delay ≥ ${CONFIG.DELAY_MAJOR_MIN} min`) +
      count(C.trainStale, stale, 'stale / uncertain');

    // ── One-line network state ──
    const multiplier = rateLimiter.effectiveMultiplier;
    const rps = rateLimiter.requestsPerSecond;
    const net = this._el.querySelector('#hud-net');
    if (multiplier < 0.95) {
      net.textContent = `backing off ×${multiplier.toFixed(2)} · ${rps} req/s`;
      net.style.color = 'var(--amber)';
    } else {
      net.textContent = `live · ${rps} req/s`;
      net.style.color = 'var(--ink-dim)';
    }

    if (this._expanded) this._renderDebug({ rateLimiter, cache, trainStore, scheduler, apiClient });
  }

  _renderDebug({ rateLimiter, cache, trainStore, scheduler, apiClient }) {
    const rps = rateLimiter.requestsPerSecond;
    const ceiling = rateLimiter.ceiling;   // effective ceiling (reflects backoff)
    const rpsClass = rps > ceiling ? 'danger' : rps > ceiling * 0.8 ? 'warn' : 'good';
    const util = Math.round(rateLimiter.utilization * 100);
    const utilClass = util > 90 ? 'danger' : util > 70 ? 'warn' : 'good';
    const hitRate = Math.round(cache.hitRate * 100);
    const rendered = trainStore.renderedCount;
    const sampled = trainStore.sampledThisSecond;
    const multiplier = rateLimiter.effectiveMultiplier;
    const budgetClass = multiplier < 0.5 ? 'danger' : multiplier < 0.9 ? 'warn' : 'good';

    // RPS history sparkline (last 60s)
    const history = rateLimiter.history.slice(-60);
    const maxRps = Math.max(ceiling, ...history.map(h => h.rps));
    const sparkW = 220, sparkH = 28;
    const bars = history.map((h, i) => {
      const x = (i / 60) * sparkW;
      const bh = Math.max(1, (h.rps / maxRps) * sparkH);
      const color = h.rps > ceiling ? '#ef5350' : '#4fc3f7';
      return `<rect x="${x}" y="${sparkH - bh}" width="3" height="${bh}" fill="${color}" opacity="0.8"/>`;
    }).join('');
    const ceilingY = sparkH - (ceiling / maxRps) * sparkH;

    // Staleness list (top 8 stalest)
    const staleReport = trainStore.stalenessReport().slice(0, 8);
    const staleRows = staleReport.map(t => {
      const age = Math.round(t.ageSec);
      const cls = age > 60 ? 'style="color:#ef5350"' : age > 30 ? 'style="color:#ffb74d"' : '';
      return `<div class="stale-entry"><span>${t.number ?? t.id}</span><span class="age" ${cls}>${age}s</span></div>`;
    }).join('');

    this._debugEl.innerHTML = `
      <div class="divider"></div>
      <div class="row"><span class="label">req/s</span><span class="value ${rpsClass}">${rps} / ${ceiling} ceiling</span></div>
      <svg width="${sparkW}" height="${sparkH}" style="margin:2px 0 4px">
        ${bars}
        <line x1="0" y1="${ceilingY}" x2="${sparkW}" y2="${ceilingY}" stroke="#ef5350" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
      </svg>
      <div class="row"><span class="label">budget</span><span class="value ${utilClass}">${util}% used</span></div>
      <div class="bar-container"><div class="bar-fill" style="width:${util}%;background:${util > 90 ? '#ef5350' : util > 70 ? '#ffb74d' : '#66bb6a'}"></div></div>
      <div class="row"><span class="label">eff. budget</span><span class="value ${budgetClass}">×${multiplier.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="label">cache hit</span><span class="value">${hitRate}%</span></div>
      <div class="row"><span class="label">cache size</span><span class="value">${cache.size}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="label">trains rendered</span><span class="value good">${rendered}</span></div>
      <div class="row"><span class="label">sampled this sec</span><span class="value">${sampled}</span></div>
      <div class="row"><span class="label">scheduler targets</span><span class="value">${scheduler.targetCount}</span></div>
      <div class="row"><span class="label">scheduler gated</span><span class="value">${scheduler.gatedCount}</span></div>
      <div class="row"><span class="label">api errors</span><span class="value ${apiClient.requestsErrored > 0 ? 'warn' : ''}">${apiClient.requestsErrored}</span></div>
      <div class="divider"></div>
      <div class="label" style="margin-bottom:2px">staleness (top 8)</div>
      <div id="staleness-list">${staleRows || '<span style="color:#555">no trains</span>'}</div>
    `;
  }
}
