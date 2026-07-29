// ── Debug HUD ──────────────────────────────────────────────────────────
// Shows: req/s with ceiling, budget utilization, cache hit rate,
// rendered vs sampled trains, per-train staleness.

import { CONFIG } from './config.js';

export class HUD {
  constructor() {
    this._el = document.createElement('div');
    this._el.id = 'hud';
    document.getElementById('app').appendChild(this._el);
    this._lastUpdate = 0;
  }

  update({ rateLimiter, cache, trainStore, scheduler, apiClient }) {
    // Throttle DOM updates to ~4fps
    const now = performance.now();
    if (now - this._lastUpdate < 250) return;
    this._lastUpdate = now;

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

    this._el.innerHTML = `
      <h3>⚡ TRENITALIA LIVE MAP</h3>
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
