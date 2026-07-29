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
import { project, lerpGeo, shuttlePosition } from './projection.js';
import { stationById } from './stations.js';

export class TrainStore {
  constructor() {
    this._trains = new Map(); // trainId → TrainState
    this._rail = null;        // RailIndex for snapping onto real tracks
    this.renderedCount = 0;
    this.sampledThisSecond = 0;
    this._sampleWindow = 0;
    this._sampleWindowStart = performance.now();
  }

  /** Provide the rail index used to snap forecast positions onto tracks. */
  setRailIndex(rail) {
    this._rail = rail;
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
      phaseH: data.phaseH ?? 0,
      layoverH: data.layoverH ?? 0.3,
      direction: 1,
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
      if (data.phaseH != null) existing.phaseH = data.phaseH;  // keep dead-reckoning in sync
      if (data.layoverH != null) existing.layoverH = data.layoverH;
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

      // ── Forecast from the timetable: advance the phase and evaluate the
      //    shuttle schedule (out → layover → back → layover). ──
      let dir = t.direction ?? 1;
      let stopped = false;
      if (t.segments && t.status === 'running') {
        t.phaseH = (t.phaseH ?? 0) + (dt * CONFIG.SIM_SPEED_SCALE) / 60;
        const pos = shuttlePosition(
          t.totalKm, t.speedKmh, t.layoverH ?? 0.3, t.phaseH - t.delayMin / 60);
        const km = pos.km;
        dir = pos.dir;
        stopped = pos.stopped;
        t.progressKm = km;
        t.direction = dir;

        // Straight-line forecast position along the route segments.
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
          const p = lerpGeo(from.lat, from.lng, to.lat, to.lng, frac);
          t.lat = p.lat;
          t.lng = p.lng;
        }
        t.currentSegIdx = segIdx;
      }

      t.lastTickTime = now;

      // ── Project, then snap onto the nearest real track so the forecast
      //    follows the visible rail instead of cutting chords. ──
      const proj = project(t.lat, t.lng);
      let fx = proj.x, fy = proj.y, trackAngle = null;
      if (this._rail) {
        const snap = this._rail.nearest(proj.x, proj.y);
        if (snap.dist < CONFIG.SNAP_MAX_WORLD) {
          fx = snap.x;
          fy = snap.y;
          trackAngle = snap.angle;
        }
      }
      t.x = fx;
      t.y = fy;

      // ── Heading: align to the track bearing (flipped on the return leg),
      //    smoothed so the glyph banks gently through curves. ──
      if (trackAngle != null && dir !== 0) {
        const target = trackAngle + (dir < 0 ? Math.PI : 0);
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
