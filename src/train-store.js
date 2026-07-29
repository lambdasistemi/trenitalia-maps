// ── Train store ────────────────────────────────────────────────────────
// Central state for all known trains.
//
// Dead-reckoning: between sparse API samples, each train's position is
// interpolated along its route using schedule + speed + delay. The map
// animates at 60fps; the network samples at ≤ N/sec.
//
// Reconciliation: when a fresh sample arrives, the estimate is blended
// toward the truth over several frames (no teleporting).

import { CONFIG } from './config.js';
import { project, lerpGeo } from './projection.js';
import { stationById } from './stations.js';

export class TrainStore {
  constructor() {
    this._trains = new Map(); // trainId → TrainState
    this.renderedCount = 0;
    this.sampledThisSecond = 0;
    this._sampleWindow = 0;
    this._sampleWindowStart = performance.now();
  }

  /** Seed a train from static timetable data (free — outside live budget).
   *  Gives the map a full, alive population from the first frame. */
  seed(data) {
    if (!data || this._trains.has(data.trainId)) return;
    const p = project(data.lat, data.lng);
    this._trains.set(data.trainId, {
      id: data.trainId,
      number: data.number,
      type: data.type,
      route: data.route,
      segments: data.segments,
      totalKm: data.totalKm,
      speedKmh: data.speedKmh,
      lat: data.lat, lng: data.lng,
      x: p.x, y: p.y,
      targetLat: data.lat, targetLng: data.lng,
      progressKm: data.progressKm,
      currentSegIdx: data.currentSegIdx,
      delayMin: data.delayMin,
      // Seeded from timetable, not yet confirmed by a live sample.
      lastSample: performance.now() - CONFIG.CACHE_TTL_TRAIN_PROGRESS_MS,
      status: data.status,
      reconciling: false,
      lastTickTime: performance.now(),
      origin: data.route?.[0],
      destination: data.route?.[data.route.length - 1],
    });
  }

  /** Ingest a train-progress sample from the API. */
  ingestProgress(data) {
    if (!data) return;
    const existing = this._trains.get(data.trainId);

    if (existing) {
      // ── Reconcile: set target to truth, blend over frames ──
      existing.targetLat = data.lat;
      existing.targetLng = data.lng;
      existing.delayMin = data.delayMin;
      existing.lastSample = performance.now();
      existing.status = data.status;
      existing.progressKm = data.progressKm;
      existing.currentSegIdx = data.currentSegIdx;
      existing.reconciling = true;
    } else {
      // ── First sighting: create state ──
      const p = project(data.lat, data.lng);
      this._trains.set(data.trainId, {
        id: data.trainId,
        number: data.number,
        type: data.type,
        route: data.route,
        segments: data.segments,
        totalKm: data.totalKm,
        speedKmh: data.speedKmh,
        // Estimated position (what we render)
        lat: data.lat, lng: data.lng,
        x: p.x, y: p.y,
        // Target position (truth from last sample)
        targetLat: data.lat, targetLng: data.lng,
        // Interpolation state
        progressKm: data.progressKm,
        currentSegIdx: data.currentSegIdx,
        delayMin: data.delayMin,
        lastSample: performance.now(),
        status: data.status,
        reconciling: false,
        // For dead-reckoning
        lastTickTime: performance.now(),
      });
    }
    this._trackSample();
  }

  /** Ingest a station-board sample (discovers new trains). */
  ingestBoard(stationId, entries) {
    if (!entries || !Array.isArray(entries)) return;
    for (const e of entries) {
      if (!this._trains.has(e.trainId)) {
        // We know the train exists but not its position yet.
        // Create a placeholder at the station; the scheduler will
        // poll its progress soon.
        const st = stationById.get(stationId);
        if (!st) continue;
        const p = project(st.lat, st.lng);
        this._trains.set(e.trainId, {
          id: e.trainId,
          number: e.number,
          type: e.type,
          route: null,
          segments: null,
          totalKm: 0,
          speedKmh: CONFIG.SIM_SPEED_KMH[e.type] ?? 100,
          lat: st.lat, lng: st.lng,
          x: p.x, y: p.y,
          targetLat: st.lat, targetLng: st.lng,
          progressKm: 0,
          currentSegIdx: 0,
          delayMin: e.delayMin ?? 0,
          lastSample: performance.now(),
          status: e.status ?? 'running',
          reconciling: false,
          lastTickTime: performance.now(),
          placeholder: true, // no route data yet
        });
      }
    }
    this._trackSample();
  }

  /** Advance all trains by dead-reckoning. Called every frame. */
  tick() {
    const now = performance.now();
    let rendered = 0;

    for (const [id, t] of this._trains) {
      const age = now - t.lastSample;

      // ── Expire ──
      if (age > CONFIG.EXPIRE_THRESHOLD_MS) {
        this._trains.delete(id);
        continue;
      }

      // ── Reconciliation blend ──
      if (t.reconciling) {
        const a = CONFIG.RECONCILE_ALPHA;
        t.lat += (t.targetLat - t.lat) * a;
        t.lng += (t.targetLng - t.lng) * a;
        if (Math.abs(t.lat - t.targetLat) < 0.0001 && Math.abs(t.lng - t.targetLng) < 0.0001) {
          t.lat = t.targetLat;
          t.lng = t.targetLng;
          t.reconciling = false;
        }
      }

      // ── Dead-reckoning: advance along route ──
      if (!t.reconciling && t.segments && t.status === 'running') {
        const dt = (now - t.lastTickTime) / 1000; // seconds
        // 1 real second = 1 sim minute (matches simulator)
        const simHoursElapsed = dt / 60;
        const kmAdvanced = simHoursElapsed * t.speedKmh;
        t.progressKm = Math.min(t.progressKm + kmAdvanced, t.totalKm);

        // Find current segment and interpolate position
        let segIdx = 0;
        for (let j = 0; j < t.segments.length; j++) {
          const seg = t.segments[j];
          const segStart = t.segments.slice(0, j).reduce((s, x) => s + x.km, 0);
          if (t.progressKm >= segStart) segIdx = j;
        }
        const seg = t.segments[segIdx];
        if (seg) {
          const segStart = t.segments.slice(0, segIdx).reduce((s, x) => s + x.km, 0);
          const frac = Math.min((t.progressKm - segStart) / seg.km, 1);
          const from = stationById.get(seg.from);
          const to = stationById.get(seg.to);
          if (from && to) {
            const pos = lerpGeo(from.lat, from.lng, to.lat, to.lng, frac);
            t.lat = pos.lat;
            t.lng = pos.lng;
          }
        }
      }

      t.lastTickTime = now;

      // Project to world coords
      const p = project(t.lat, t.lng);
      t.x = p.x;
      t.y = p.y;

      // Count rendered (not expired, not too stale)
      if (age < CONFIG.EXPIRE_THRESHOLD_MS) rendered++;
    }

    this.renderedCount = rendered;
  }

  /** All trains as an array (for the renderer). */
  all() {
    return [...this._trains.values()];
  }

  get(id) {
    return this._trains.get(id);
  }

  get count() {
    return this._trains.size;
  }

  /** Staleness distribution for the HUD. */
  stalenessReport() {
    const now = performance.now();
    const entries = [];
    for (const t of this._trains.values()) {
      entries.push({
        id: t.id,
        number: t.number,
        ageSec: (now - t.lastSample) / 1000,
      });
    }
    entries.sort((a, b) => b.ageSec - a.ageSec);
    return entries;
  }

  _trackSample() {
    const now = performance.now();
    if (now - this._sampleWindowStart >= 1000) {
      this.sampledThisSecond = this._sampleWindow;
      this._sampleWindow = 0;
      this._sampleWindowStart = now;
    }
    this._sampleWindow++;
  }
}
