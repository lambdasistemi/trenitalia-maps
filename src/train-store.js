// ── Train store ────────────────────────────────────────────────────────
// Central state for all known trains.
//
// Dead-reckoning: between sparse API samples, each train's position is
// interpolated along its route using schedule + speed + delay. The map
// animates at 60fps; the network samples at ≤ N/sec.
//
// Progress samples hydrate metadata and missing route state, but motion phase
// is monotonic: a stale/cached response can never rewind a rendered train.

import { CONFIG } from './config.js';
import {
  approachDirectedAngle,
  directedTrackHeading,
  pointAlongGeometry,
  project,
  shuttlePosition,
  simulationHours,
} from './projection.js';
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
    const direction = data.direction ?? 1;
    const trackAngle = data.trackAngle ?? 0;
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
      direction,
      trackAngle,
      heading: direction === 0 ? trackAngle : directedTrackHeading(trackAngle, direction),
      currentSegIdx: data.currentSegIdx,
      delayMin: data.delayMin,
      // Seeded from timetable, not yet confirmed by a live sample.
      lastSample: performance.now() - CONFIG.CACHE_TTL_TRAIN_PROGRESS_MS,
      status: data.status,
      reconciling: false,
      lastTickTime: performance.now(),
      origin: data.route?.[0],
      destination: data.route?.[data.route.length - 1],
      lastStation: data.lastStation,
      nextStation: data.nextStation,
      placeholder: false,
    });
  }

  /** Ingest a train-progress sample from the API. */
  ingestProgress(data) {
    if (!data) return;
    const existing = this._trains.get(data.trainId);

    if (existing) {
      const wasPlaceholder = existing.placeholder || !existing.segments;
      const hasNewerPhase = Number.isFinite(data.phaseH) &&
        (!Number.isFinite(existing.phaseH) || data.phaseH > existing.phaseH);
      const acceptPosition = wasPlaceholder || hasNewerPhase;

      // Always hydrate static/missing state. This is essential after expiry,
      // when a station board may have recreated only a placeholder.
      existing.number = data.number ?? existing.number;
      existing.type = data.type ?? existing.type;
      existing.route = data.route ?? existing.route;
      existing.segments = data.segments ?? existing.segments;
      existing.totalKm = data.totalKm ?? existing.totalKm;
      existing.speedKmh = data.speedKmh ?? existing.speedKmh;
      existing.layoverH = data.layoverH ?? existing.layoverH ?? 0.3;
      existing.origin = data.origin ?? data.route?.[0] ?? existing.origin;
      existing.destination = data.destination ??
        data.route?.[data.route.length - 1] ?? existing.destination;
      existing.lastStation = data.lastStation ?? existing.lastStation;
      existing.nextStation = data.nextStation ?? existing.nextStation;
      existing.delayMin = data.delayMin;
      existing.lastSample = performance.now();
      existing.status = data.status;
      existing.placeholder = false;

      // Only a newer motion sample may advance position. Cached samples are
      // deliberately ignored so they cannot pull a train backwards.
      if (acceptPosition) {
        existing.phaseH = data.phaseH ?? existing.phaseH ?? 0;
        existing.progressKm = data.progressKm ?? existing.progressKm;
        existing.currentSegIdx = data.currentSegIdx ?? existing.currentSegIdx;
      }

      if (wasPlaceholder) {
        const p = project(data.lat, data.lng);
        existing.lat = data.lat;
        existing.lng = data.lng;
        existing.x = p.x;
        existing.y = p.y;
        existing.targetLat = data.lat;
        existing.targetLng = data.lng;
        existing.direction = data.direction ?? existing.direction ?? 1;
        existing.trackAngle = data.trackAngle ?? existing.trackAngle ?? 0;
        existing.heading = existing.direction === 0
          ? existing.trackAngle
          : directedTrackHeading(existing.trackAngle, existing.direction);
        existing.lastTickTime = performance.now();
      }
      existing.reconciling = false;
    } else {
      // ── First sighting: create state ──
      const p = project(data.lat, data.lng);
      const direction = data.direction ?? 1;
      const trackAngle = data.trackAngle ?? 0;
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
        phaseH: data.phaseH ?? 0,
        layoverH: data.layoverH ?? 0.3,
        currentSegIdx: data.currentSegIdx,
        delayMin: data.delayMin,
        lastSample: performance.now(),
        status: data.status,
        reconciling: false,
        // For dead-reckoning
        lastTickTime: performance.now(),
        direction,
        trackAngle,
        heading: direction === 0 ? trackAngle : directedTrackHeading(trackAngle, direction),
        origin: data.origin ?? data.route?.[0],
        destination: data.destination ?? data.route?.[data.route.length - 1],
        lastStation: data.lastStation,
        nextStation: data.nextStation,
        placeholder: false,
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
      let trackAngle = t.trackAngle ?? 0;
      if (t.segments && t.status === 'running') {
        t.phaseH = (t.phaseH ?? 0) + simulationHours(dt, CONFIG.SIM_TIME_SCALE);
        const sp = shuttlePosition(
          t.totalKm, t.speedKmh, t.layoverH ?? 0.3, t.phaseH);
        const km = sp.km;
        dir = sp.dir;
        t.progressKm = km;
        t.direction = dir;

        // Position along the segment's real rail geometry (no snapping — the
        // path IS the track, so the train can't wander or jump lines).
        let segStart = 0, segIdx = 0;
        for (let j = 0; j < t.segments.length; j++) {
          const seg = t.segments[j];
          if (km <= segStart + seg.km || j === t.segments.length - 1) { segIdx = j; break; }
          segStart += seg.km;
        }
        const seg = t.segments[segIdx];
        if (seg.g) {
          const pos = pointAlongGeometry(seg.g, seg.cum, km - segStart);
          t.lat = pos.lat;
          t.lng = pos.lng;
          trackAngle = pos.angle;
          t.trackAngle = trackAngle;
        }
        t.currentSegIdx = segIdx;
      }

      t.lastTickTime = now;

      // ── Project to world coords. ──
      const proj = project(t.lat, t.lng);
      t.x = proj.x;
      t.y = proj.y;

      // ── Heading: align the marker's pointed nose with travel direction.
      //    Hold the last direction while stopped at a terminus. ──
      if (dir !== 0) {
        const maxStep = 2.0 * dt; // ≤ ~115°/s — gradual, never a snap
        const targetHeading = directedTrackHeading(trackAngle, dir);
        t.heading = approachDirectedAngle(t.heading ?? 0, targetHeading, maxStep);
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
