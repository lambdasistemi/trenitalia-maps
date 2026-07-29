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
import { project, lerpGeo, pingpong } from './projection.js';
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
      dist: data.dist ?? 0,
      heading: 0,
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
      if (data.dist != null) existing.dist = data.dist;  // keep dead-reckoning in sync
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

      const dt = (now - t.lastTickTime) / 1000; // real seconds since last tick

      // ── Dead-reckoning: advance monotonic dist, ping-pong into a smooth
      //    back-and-forth position (no teleport at the ends). ──
      if (t.segments && t.status === 'running') {
        const kmAdvanced = (dt * CONFIG.SIM_SPEED_SCALE / 60) * t.speedKmh;
        t.dist = (t.dist ?? 0) + kmAdvanced;
        const { km } = pingpong(t.dist, t.totalKm);
        t.progressKm = km;

        // Locate the segment containing km and interpolate lat/lng.
        let segStart = 0, segIdx = 0;
        for (let j = 0; j < t.segments.length; j++) {
          const seg = t.segments[j];
          if (km <= segStart + seg.km || j === t.segments.length - 1) { segIdx = j; break; }
          segStart += seg.km;
        }
        const seg = t.segments[segIdx];
        const from = stationById.get(seg.from);
        const to = stationById.get(seg.to);
        if (from && to) {
          const frac = Math.min(Math.max((km - segStart) / seg.km, 0), 1);
          const pos = lerpGeo(from.lat, from.lng, to.lat, to.lng, frac);
          t.lat = pos.lat;
          t.lng = pos.lng;
        }
        t.currentSegIdx = segIdx;
      }

      t.lastTickTime = now;

      // ── Project to world coords and smooth the heading from movement ──
      const oldX = t.x, oldY = t.y;
      const p = project(t.lat, t.lng);
      t.x = p.x;
      t.y = p.y;
      const dx = t.x - oldX, dy = t.y - oldY;
      if (dx * dx + dy * dy > 1e-9) {
        const target = Math.atan2(dx, dy); // glyph points +Y
        let diff = target - (t.heading ?? 0);
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        t.heading = (t.heading ?? 0) + diff * 0.2;
      }

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
