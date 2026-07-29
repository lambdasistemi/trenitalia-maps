// ── Sliding-window rate limiter (a leaky-bucket variant) ───────────────
// The SINGLE choke point every outbound request passes through.
//
// Guarantees the core invariant literally: at most N requests in ANY
// rolling 1-second window. Unlike a bursting token bucket, this can never
// spike above the ceiling — which is exactly what the acceptance test
// ("measured req/s never exceeds N") demands.
//
// Zoom, pan, viewport size, train count — none of these touch the limiter.
// The scheduler decides *what* to poll; this decides *whether* it may go.

export class RateLimiter {
  constructor(ratePerSec) {
    this._rate = ratePerSec;          // hard ceiling: requests per second
    this._stamps = [];                // timestamps of requests in the last 1s

    // ── Metrics ──
    this.totalRequests = 0;
    this.totalDenied = 0;
    this.requestsPerSecond = 0;
    this._history = [];               // { t, rps } for the HUD graph
    this._lastSample = performance.now();

    // Effective ceiling multiplier (shrinks on 429, recovers on success).
    this._effectiveMultiplier = 1.0;
  }

  /** The current effective ceiling (≥ 1). */
  get ceiling() {
    return Math.max(1, Math.round(this._rate * this._effectiveMultiplier));
  }

  _purge(now) {
    const cutoff = now - 1000;
    while (this._stamps.length && this._stamps[0] <= cutoff) this._stamps.shift();
  }

  /** Try to admit one request. True iff the 1s window has room. */
  tryConsume() {
    const now = performance.now();
    this._purge(now);
    if (this._stamps.length < this.ceiling) {
      this._stamps.push(now);
      this.totalRequests++;
      this._sample(now);
      return true;
    }
    this.totalDenied++;
    return false;
  }

  /** Requests admitted in the current rolling window (≤ ceiling). */
  get windowCount() {
    this._purge(performance.now());
    return this._stamps.length;
  }

  get utilization() {
    return this.windowCount / this.ceiling;
  }

  /** Shrink the effective ceiling on 429/5xx. */
  shrink(factor) {
    this._effectiveMultiplier = Math.max(0.1, this._effectiveMultiplier * factor);
  }

  /** Recover toward full ceiling on success. */
  recover(rate) {
    this._effectiveMultiplier = Math.min(1.0, this._effectiveMultiplier + rate);
  }

  get effectiveMultiplier() {
    return this._effectiveMultiplier;
  }

  _sample(now) {
    this.requestsPerSecond = this._stamps.length;
    if (now - this._lastSample >= 1000) {
      this._history.push({ t: now, rps: this._stamps.length });
      if (this._history.length > 120) this._history.shift();
      this._lastSample = now;
    }
  }

  /** RPS history for the HUD graph (last 120 samples). */
  get history() {
    return this._history;
  }
}
