// ── Trenitalia API simulator ───────────────────────────────────────────
// Models ~700 trains on the real Italian network, with the service mix of
// the actual system: the vast majority are regional/short-hop services,
// with a smaller layer of intercity and high-speed trains on the corridors.
// The app talks to this exactly as it would to the real API — through the
// rate limiter and cache.

import { STATIONS, EDGES, buildAdjacency, stationById } from './stations.js';
import { CONFIG } from './config.js';
import {
  distanceKm,
  pointAlongGeometry,
  shuttlePosition,
  simulationHours,
} from './projection.js';
import { randomSimpleRoute } from './route.js';

const TYPE_PREFIX = { regionale: 'R', intercity: 'IC', freccia: 'FR' };

function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

// Service mix ≈ real Italian rail: ~70% regional, 20% intercity, 10% AV.
const TYPE_MIX = [
  { type: 'regionale', weight: 0.70, len: [5, 10], maxTier: 2 },
  { type: 'intercity', weight: 0.20, len: [7, 13], maxTier: 1 },
  { type: 'freccia',   weight: 0.10, len: [9, 16], maxTier: 0 },
];

function pickType() {
  const r = Math.random();
  let acc = 0;
  for (const t of TYPE_MIX) { acc += t.weight; if (r <= acc) return t; }
  return TYPE_MIX[0];
}

export class Simulator {
  constructor() {
    this._adj = buildAdjacency();
    // Pre-bucket station indices by tier for fast constrained starts.
    this._byTier = [[], [], []];
    STATIONS.forEach(s => this._byTier[s.tier].push(s.id));
    this._trains = new Map();
    this._stationBoards = new Map();
    this._startTime = performance.now();
    this._generateTrains();
  }

  /** Random walk on the rail graph (stations ≤ maxTier). Returns the station
   *  path plus the edge taken at each step, so the route carries real geometry. */
  _randomRoute(len, maxTier) {
    const starts = [];
    for (let t = 0; t <= maxTier; t++) starts.push(...this._byTier[t]);
    return randomSimpleRoute({
      adjacency: this._adj,
      starts,
      length: len,
      maxTier,
      tierOf: stationId => STATIONS[stationId].tier,
    });
  }

  _generateTrains() {
    for (let i = 0; i < CONFIG.SIM_NUM_TRAINS; i++) {
      const spec = pickType();
      const { route, edgeIdxs } = this._randomRoute(randInt(spec.len[0], spec.len[1]), spec.maxTier);
      if (route.length < 2) continue;

      const speed = CONFIG.SIM_SPEED_KMH[spec.type];
      const trainNum = `${TYPE_PREFIX[spec.type]} ${randInt(1000, 9999)}`;

      // Build segments from the edges walked, each carrying the real rail
      // geometry (reversed if the walk goes against the edge's a→b sense).
      const segments = [];
      let totalKm = 0;
      for (let j = 0; j < edgeIdxs.length; j++) {
        const edge = EDGES[edgeIdxs[j]];
        const from = route[j], to = route[j + 1];
        const g = edge.a === from ? edge.g : edge.g.slice().reverse();
        const cum = [0];
        for (let k = 1; k < g.length; k++) {
          cum.push(cum[k - 1] + distanceKm(g[k - 1][1], g[k - 1][0], g[k][1], g[k][0]));
        }
        segments.push({ from, to, km: edge.km, g, cum, startKm: totalKm });
        totalKm += edge.km;
      }
      if (!segments.length) continue;

      const train = {
        id: `T${i}`,
        number: trainNum,
        type: spec.type,
        route,
        segments,
        totalKm,
        speedKmh: speed,
        departHour: rand(5, 23),
        // Turnaround time at each terminus + phase offset so services are
        // spread around their cycle rather than departing in a pack.
        layoverH: rand(CONFIG.SIM_LAYOVER_H[0], CONFIG.SIM_LAYOVER_H[1]),
        delayMin: Math.random() < 0.3 ? rand(1, 45) : rand(0, 3),
        currentSegIdx: 0,
        progressKm: 0,
        direction: 1,
        stopped: false,
        trackAngle: 0,
        lat: 0, lng: 0,
        lastStation: route[0],
        nextStation: route[1],
        status: 'running',
      };
      train.phaseOffset = -train.departHour;

      this._trains.set(train.id, train);
      for (const sid of route) {
        if (!this._stationBoards.has(sid)) this._stationBoards.set(sid, new Set());
        this._stationBoards.get(sid).add(train.id);
      }
    }
    this._tick();
  }

  /** Advance all trains from their timetable. Position is forecast from
   *  schedule + speed (a shuttle: out, layover, back, layover); live delay
   *  shifts the phase. */
  _tick() {
    const elapsedSec = (performance.now() - this._startTime) / 1000;
    const elapsedSimH = simulationHours(elapsedSec, CONFIG.SIM_TIME_SCALE);

    for (const train of this._trains.values()) {
      train.status = 'running';

      // Motion phase is continuous. Delay is live metadata and must never
      // teleport a train when its reported value changes.
      const phaseH = elapsedSimH + train.phaseOffset;
      const { km, dir, stopped } = shuttlePosition(
        train.totalKm, train.speedKmh, train.layoverH, phaseH);
      train.progressKm = km;
      train.direction = dir;
      train.stopped = stopped;

      // Interpolate the forecast position along the segment's rail geometry.
      let segStart = 0, segIdx = 0;
      for (let j = 0; j < train.segments.length; j++) {
        const seg = train.segments[j];
        if (km <= segStart + seg.km || j === train.segments.length - 1) { segIdx = j; break; }
        segStart += seg.km;
      }
      const seg = train.segments[segIdx];
      const pos = pointAlongGeometry(seg.g, seg.cum, km - segStart);
      train.lat = pos.lat;
      train.lng = pos.lng;
      train.trackAngle = pos.angle;
      train.currentSegIdx = segIdx;
      train.lastStation = seg.from;
      train.nextStation = seg.to;

      if (Math.random() < 0.001) {
        train.delayMin = Math.max(0, train.delayMin + rand(-2, 5));
      }
    }
  }

  // ── Bootstrap: static timetable data (never draws from live budget) ──

  /** Return every train's route + current scheduled position. This models
   *  the "stable timetable" that loads once, for free — the live API budget
   *  is reserved for volatile position/delay deltas. */
  bootstrapTimetable() {
    this._tick();
    const elapsedSimH = simulationHours(
      (performance.now() - this._startTime) / 1000,
      CONFIG.SIM_TIME_SCALE,
    );
    const out = [];
    for (const t of this._trains.values()) {
      out.push({
        trainId: t.id,
        number: t.number,
        type: t.type,
        route: t.route,
        segments: t.segments,
        totalKm: t.totalKm,
        progressKm: t.progressKm,
        phaseH: elapsedSimH + t.phaseOffset,   // dead-reckoning continues from here
        layoverH: t.layoverH,
        direction: t.direction,
        trackAngle: t.trackAngle,
        lat: t.lat,
        lng: t.lng,
        lastStation: t.lastStation,
        nextStation: t.nextStation,
        currentSegIdx: t.currentSegIdx,
        delayMin: Math.round(t.delayMin),
        speedKmh: t.speedKmh,
        status: t.status,
        scheduledHour: t.departHour,
        origin: t.route[0],
        destination: t.route[t.route.length - 1],
      });
    }
    return out;
  }

  // ── Simulated API endpoints ──────────────────────────────────────────

  async stationBoard(stationId, arrivals = false) {
    await this._latency();
    if (Math.random() < CONFIG.SIM_ERROR_RATE) {
      throw { status: 429, message: 'Too Many Requests' };
    }
    this._tick();

    const trainIds = this._stationBoards.get(stationId) ?? [];
    const results = [];
    for (const tid of trainIds) {
      const t = this._trains.get(tid);
      if (!t || t.status !== 'running') continue;
      const atStation = arrivals ? t.nextStation === stationId : t.lastStation === stationId;
      if (!atStation) continue;
      results.push({
        trainId: t.id, number: t.number, type: t.type,
        origin: t.route[0], destination: t.route[t.route.length - 1],
        lastStation: t.lastStation, nextStation: t.nextStation,
        delayMin: Math.round(t.delayMin), scheduledHour: t.departHour, status: t.status,
      });
    }
    return results;
  }

  async trainProgress(trainId) {
    await this._latency();
    if (Math.random() < CONFIG.SIM_ERROR_RATE) {
      throw { status: 429, message: 'Too Many Requests' };
    }
    this._tick();

    const t = this._trains.get(trainId);
    if (!t) throw { status: 404, message: 'Not found' };
    const elapsedSimH = simulationHours(
      (performance.now() - this._startTime) / 1000,
      CONFIG.SIM_TIME_SCALE,
    );
    return {
      trainId: t.id, number: t.number, type: t.type, route: t.route,
      segments: t.segments,
      totalKm: t.totalKm, progressKm: t.progressKm,
      phaseH: elapsedSimH + t.phaseOffset, layoverH: t.layoverH,
      direction: t.direction, trackAngle: t.trackAngle,
      lat: t.lat, lng: t.lng,
      lastStation: t.lastStation, nextStation: t.nextStation,
      currentSegIdx: t.currentSegIdx, delayMin: Math.round(t.delayMin),
      speedKmh: t.speedKmh, status: t.status, scheduledHour: t.departHour,
      origin: t.route[0], destination: t.route[t.route.length - 1],
    };
  }

  allTrainIds() { return [...this._trains.keys()]; }

  _latency() {
    const [lo, hi] = CONFIG.SIM_LATENCY_MS;
    return new Promise(r => setTimeout(r, rand(lo, hi)));
  }
}
