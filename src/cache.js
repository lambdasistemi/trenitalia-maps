// ── TTL cache with staleness tracking and in-flight coalescing ─────────

export class Cache {
  constructor() {
    this._store = new Map();   // key → { value, expires, fetchedAt }
    this._inflight = new Map(); // key → Promise (coalesce duplicates)

    // Metrics
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (performance.now() > entry.expires) {
      this.misses++;
      return undefined;   // expired — caller should re-fetch
    }
    this.hits++;
    return entry.value;
  }

  /** Stale value (past TTL) if available — for fallback rendering. */
  getStale(key) {
    const entry = this._store.get(key);
    return entry ? entry.value : undefined;
  }

  set(key, value, ttlMs) {
    this._store.set(key, { value, expires: performance.now() + ttlMs, fetchedAt: performance.now() });
  }

  /** Age in ms since the value was fetched, or Infinity if absent. */
  age(key) {
    const entry = this._store.get(key);
    return entry ? performance.now() - entry.fetchedAt : Infinity;
  }

  /** Coalesce: if a fetch for `key` is already in flight, return the
   *  same promise instead of issuing a duplicate request. */
  coalesce(key, fetchFn) {
    if (this._inflight.has(key)) return this._inflight.get(key);
    const p = fetchFn().finally(() => this._inflight.delete(key));
    this._inflight.set(key, p);
    return p;
  }

  get hitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  get size() {
    return this._store.size;
  }
}
