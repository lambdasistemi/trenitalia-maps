// ── API client ─────────────────────────────────────────────────────────
// Wraps the data source (simulator or real API) with:
//   - TTL caching with in-flight coalescing
//   - exponential backoff on 429 / 5xx (adjusts rate-limiter budget)
//
// NOTE: Rate-limiting gating lives in the Scheduler — the single choke
// point. This client does NOT gate; it only handles cache + backoff.

import { CONFIG } from './config.js';

export class ApiClient {
  constructor(source, rateLimiter, cache) {
    this._source = source;   // Simulator (or real fetch wrapper)
    this._rl = rateLimiter;  // used only for backoff shrink/recover
    this._cache = cache;
    this._backoffUntil = 0;
    this._consecutiveErrors = 0;

    // Metrics
    this.requestsIssued = 0;
    this.requestsErrored = 0;
    this.samplesThisSecond = 0;
    this._sampleWindowStart = performance.now();
  }

  /** Poll a station board. Returns [] if gated or cached. */
  async stationBoard(stationId, arrivals = false) {
    const key = `board:${stationId}:${arrivals ? 'a' : 'd'}`;
    return this._fetch(key, CONFIG.CACHE_TTL_STATION_BOARD_MS, () =>
      this._source.stationBoard(stationId, arrivals)
    );
  }

  /** Poll train progress. Returns null if gated or cached. */
  async trainProgress(trainId) {
    const key = `train:${trainId}`;
    return this._fetch(key, CONFIG.CACHE_TTL_TRAIN_PROGRESS_MS, () =>
      this._source.trainProgress(trainId)
    );
  }

  async _fetch(key, ttl, fetchFn) {
    // 1. Cache hit?
    const cached = this._cache.get(key);
    if (cached !== undefined) return cached;

    // 2. Backoff active?
    if (performance.now() < this._backoffUntil) return undefined;

    // 3. Coalesce duplicate in-flight requests and fetch
    try {
      const result = await this._cache.coalesce(key, () => fetchFn());
      this._cache.set(key, result, ttl);
      this.requestsIssued++;
      this._onSuccess();
      return result;
    } catch (err) {
      this.requestsErrored++;
      this._onError(err);
      // Serve stale on error rather than nothing
      return this._cache.getStale(key);
    }
  }

  _onSuccess() {
    this._consecutiveErrors = 0;
    this._rl.recover(CONFIG.BACKOFF_BUDGET_RECOVER_RATE);
    this._trackSample();
  }

  _onError(err) {
    this._consecutiveErrors++;
    const status = err?.status ?? 500;
    if (status === 429 || status >= 500) {
      // Shrink budget
      this._rl.shrink(CONFIG.BACKOFF_BUDGET_SHRINK);
      // Exponential backoff
      const delay = Math.min(
        CONFIG.BACKOFF_MAX_MS,
        CONFIG.BACKOFF_BASE_MS * CONFIG.BACKOFF_MULTIPLIER ** this._consecutiveErrors
      );
      this._backoffUntil = performance.now() + delay;
    }
  }

  _trackSample() {
    const now = performance.now();
    if (now - this._sampleWindowStart >= 1000) {
      this.samplesThisSecond = 0;
      this._sampleWindowStart = now;
    }
    this.samplesThisSecond++;
  }
}
