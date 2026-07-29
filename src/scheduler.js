// ── Priority scheduler ─────────────────────────────────────────────────
// Decides WHAT to poll next. The rate limiter decides WHETHER it goes.
//
// Zoom / pan / viewport change the PRIORITY ORDERING of targets.
// They NEVER change the budget. The same N tokens/sec are simply
// reallocated to whatever is in view.

import { CONFIG } from './config.js';

/** A poll target: either a station board or a train progress query. */
class Target {
  constructor(kind, id, label) {
    this.kind = kind;       // 'station' | 'train'
    this.id = id;
    this.label = label;
    this.priority = 0;
    this.lastPolled = 0;    // performance.now() of last successful poll
    this.polled = false;    // has been polled at least once?
  }

  get stalenessSec() {
    return this.polled ? (performance.now() - this.lastPolled) / 1000 : 999;
  }
}

export class Scheduler {
  constructor(apiClient, rateLimiter) {
    this._api = apiClient;
    this._rl = rateLimiter;
    this._targets = new Map();  // key → Target
    this._viewport = null;      // { x0, y0, x1, y1 } in world coords
    this._trainPositions = new Map(); // trainId → { x, y } for priority calc
    this._stationPositions = new Map(); // stationId → { x, y }
    this._onSample = null;      // callback(kind, id, data)

    this._tickTimer = setInterval(() => this._tick(), CONFIG.SCHEDULER_TICK_MS);

    // Metrics
    this.pollsPerSecond = 0;
    this.gatedCount = 0;
    this._pollWindow = 0;
    this._pollWindowStart = performance.now();
  }

  /** Register a station as a potential poll target. */
  addStation(stationId, x, y) {
    const key = `s:${stationId}`;
    if (!this._targets.has(key)) {
      this._targets.set(key, new Target('station', stationId, stationId));
    }
    this._stationPositions.set(stationId, { x, y });
  }

  /** Register a train as a potential poll target. */
  addTrain(trainId) {
    const key = `t:${trainId}`;
    if (!this._targets.has(key)) {
      this._targets.set(key, new Target('train', trainId, trainId));
    }
  }

  /** Update a train's world position (for priority calc). */
  setTrainPosition(trainId, x, y) {
    this._trainPositions.set(trainId, { x, y });
  }

  /** Called by the renderer whenever the camera moves. */
  setViewport(x0, y0, x1, y1) {
    this._viewport = { x0, y0, x1, y1 };
  }

  /** Set the callback invoked when a sample arrives. */
  onSample(cb) {
    this._onSample = cb;
  }

  /** The main scheduler tick: issue at most one request per tick,
   *  gated by the rate limiter. */
  async _tick() {
    // Budget check — if no tokens, do nothing. Zoom doesn't help here.
    // (The rate limiter is the single source of truth for "may I go?")

    // Score all targets
    const scored = [];
    for (const target of this._targets.values()) {
      target.priority = this._score(target);
      scored.push(target);
    }

    // Sort descending by priority
    scored.sort((a, b) => b.priority - a.priority);

    // Issue requests for the top targets while budget allows.
    // Typically 0 or 1 per tick; occasionally 2 if budget has accumulated.
    let issued = 0;
    const maxPerTick = 2;
    for (const target of scored) {
      if (issued >= maxPerTick) break;
      if (!this._rl.tryConsume()) { this.gatedCount++; break; }  // ← THE gate

      issued++;
      this._pollWindow++;
      const now = performance.now();
      if (now - this._pollWindowStart >= 1000) {
        this.pollsPerSecond = this._pollWindow;
        this._pollWindow = 0;
        this._pollWindowStart = now;
      }

      target.lastPolled = now;
      target.polled = true;

      try {
        let data;
        if (target.kind === 'station') {
          data = await this._api.stationBoard(target.id);
        } else {
          data = await this._api.trainProgress(target.id);
        }
        if (data && this._onSample) {
          this._onSample(target.kind, target.id, data);
        }
      } catch {
        // Error handling is in ApiClient; scheduler just moves on.
      }
    }
  }

  /** Score a target. Higher = more urgent.
   *  Viewport feeds priority, NEVER the rate. */
  _score(target) {
    let score = 0;

    // ── Viewport visibility ──
    const pos = target.kind === 'station'
      ? this._stationPositions.get(target.id)
      : this._trainPositions.get(target.id);

    if (pos && this._viewport) {
      const vp = this._viewport;
      const margin = (vp.x1 - vp.x0) * 0.2; // "near-screen" band
      const inView = pos.x >= vp.x0 && pos.x <= vp.x1 && pos.y >= vp.y0 && pos.y <= vp.y1;
      const nearView = pos.x >= vp.x0 - margin && pos.x <= vp.x1 + margin &&
                       pos.y >= vp.y0 - margin && pos.y <= vp.y1 + margin;

      if (inView) score += CONFIG.PRIORITY_ONSCREEN;
      else if (nearView) score += CONFIG.PRIORITY_NEARSCREEN;
      else score += CONFIG.PRIORITY_OFFSCREEN;
    } else {
      score += CONFIG.PRIORITY_OFFSCREEN;
    }

    // ── Staleness: least-recently-sampled first ──
    score += target.stalenessSec * CONFIG.PRIORITY_STALE_BONUS_PER_SEC;

    // ── Never-polled targets get a big boost ──
    if (!target.polled) score += 200;

    return score;
  }

  get targetCount() {
    return this._targets.size;
  }

  destroy() {
    clearInterval(this._tickTimer);
  }
}
