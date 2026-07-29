// ── Trenitalia API simulator ───────────────────────────────────────────
// Models ~700 trains on the real Italian network, with the service mix of
// the actual system: the vast majority are regional/short-hop services,
// with a smaller layer of intercity and high-speed trains on the corridors.
// The app talks to this exactly as it would to the real API — through the
// rate limiter and cache.

import { STATIONS, buildAdjacency, stationById } from './stations.js';
import { CONFIG } from './config.js';
import { distanceKm } from './projection.js';

const TYPE_PREFIX = { regionale: 'R', intercity: 'IC', freccia: 'FR' };

function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

// Service mix ≈ real Italian rail: ~70% regional, 20% intercity, 10% AV.
const TYPE_MIX = [
  { type: 'regionale', weight: 0.70, len: [2, 4], maxTier: 2 },
  { type: 'intercity', weight: 0.20, len: [4, 7], maxTier: 1 },
  { type: 'freccia',   weight: 0.10, len: [5, 9], maxTier: 0 },
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

  /** Random walk on the rail graph, constrained to stations ≤ maxTier. */
  _randomRoute(len, maxTier) {
    const starts = [];
    for (let t = 0; t <= maxTier; t++) starts.push(...this._byTier[t]);
    let current = pick(starts);
    const route = [current];
    for (let i = 1; i < len; i++) {
      const neighbors = this._adj[current].filter(n => STATIONS[n].tier <= maxTier);
      if (neighbors.length === 0) break;
      const prev = route[route.length - 2];
      const choices = neighbors.filter(n => n !== prev);
      current = pick(choices.length > 0 ? choices : neighbors);
      route.push(current);
    }
    return route;
  }

  _generateTrains() {
    for (let i = 0; i < CONFIG.SIM_NUM_TRAINS; i++) {
      const spec = pickType();
      const route = this._randomRoute(randInt(spec.len[0], spec.len[1]), spec.maxTier);
      if (route.length < 2) continue;

      const speed = CONFIG.SIM_SPEED_KMH[spec.type];
      const trainNum = `${TYPE_PREFIX[spec.type]} ${randInt(1000, 9999)}`;

      const segments = [];
      let totalKm = 0;
      for (let j = 0; j < route.length - 1; j++) {
        const a = stationById.get(route[j]);
        const b = stationById.get(route[j + 1]);
        const km = distanceKm(a.lat, a.lng, b.lat, b.lng);
        segments.push({ from: route[j], to: route[j + 1], km, startKm: totalKm });
        totalKm += km;
      }

      const train = {
        id: `T${i}`,
        number: trainNum,
        type: spec.type,
        route,
        segments,
        totalKm,
        speedKmh: speed,
        departHour: rand(5, 23),
        delayMin: Math.random() < 0.3 ? rand(1, 45) : rand(0, 3),
        currentSegIdx: 0,
        progressKm: 0,
        lat: 0, lng: 0,
        lastStation: route[0],
        nextStation: route[1],
        status: 'running',
      };

      this._trains.set(train.id, train);
      for (const sid of route) {
        if (!this._stationBoards.has(sid)) this._stationBoards.set(sid, new Set());
        this._stationBoards.get(sid).add(train.id);
      }
    }
    this._tick();
  }

  /** Advance all trains based on elapsed sim time (1 real s = 1 sim min).
   *  Every train runs continuously, looping its route, so the map stays
   *  dense and alive at all times. */
  _tick() {
    const elapsedMin = (performance.now() - this._startTime) / 1000;
    const simHour = (CONFIG.SIM_START_HOUR + elapsedMin / 60) % 24;

    for (const train of this._trains.values()) {
      train.status = 'running';

      // Phase along the day, offset by the train's departure hour, so
      // trains are spread out along their routes rather than bunched.
      let phase = simHour - train.departHour;
      if (phase < 0) phase += 24;
      const kmIntoTrip = (phase * train.speedKmh) % train.totalKm;

      let segIdx = 0;
      for (let j = 0; j < train.segments.length; j++) {
        if (kmIntoTrip >= train.segments[j].startKm) segIdx = j;
      }
      const seg = train.segments[segIdx];
      const segProgress = (kmIntoTrip - seg.startKm) / seg.km;

      const from = stationById.get(seg.from);
      const to = stationById.get(seg.to);
      train.lat = from.lat + (to.lat - from.lat) * Math.min(segProgress, 1);
      train.lng = from.lng + (to.lng - from.lng) * Math.min(segProgress, 1);
      train.currentSegIdx = segIdx;
      train.progressKm = kmIntoTrip;
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
    const out = [];
    for (const t of this._trains.values()) {
      out.push({
        trainId: t.id,
        number: t.number,
        type: t.type,
        route: t.route,
        segments: t.segments.map(s => ({ from: s.from, to: s.to, km: s.km })),
        totalKm: t.totalKm,
        progressKm: t.progressKm,
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
    return {
      trainId: t.id, number: t.number, type: t.type, route: t.route,
      segments: t.segments.map(s => ({ from: s.from, to: s.to, km: s.km })),
      totalKm: t.totalKm, progressKm: t.progressKm, lat: t.lat, lng: t.lng,
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
