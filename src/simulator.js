// ── Trenitalia API simulator ───────────────────────────────────────────
// Mimics the sparse, per-station / per-train nature of the real RFI /
// ViaggiaTreno endpoints. The app talks to this exactly as it would to
// the real API — through the rate limiter and cache.

import { STATIONS, CONNECTIONS, stationById } from './stations.js';
import { CONFIG } from './config.js';
import { distanceKm } from './projection.js';

const TRAIN_TYPES = ['regionale', 'intercity', 'freccia'];
const TYPE_PREFIX = { regionale: 'R', intercity: 'IC', freccia: 'FR' };

function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

/** Build an adjacency list from CONNECTIONS. */
function buildAdjacency() {
  const adj = new Map();
  for (const s of STATIONS) adj.set(s.id, []);
  for (const [a, b] of CONNECTIONS) {
    adj.get(a)?.push(b);
    adj.get(b)?.push(a);
  }
  return adj;
}

/** Random walk on the rail graph to build a route of `len` stations. */
function randomRoute(adj, len) {
  let current = pick(STATIONS).id;
  const route = [current];
  for (let i = 1; i < len; i++) {
    const neighbors = adj.get(current);
    if (!neighbors || neighbors.length === 0) break;
    // Avoid immediate backtracking when possible
    const prev = route[route.length - 2];
    const choices = neighbors.filter(n => n !== prev);
    current = pick(choices.length > 0 ? choices : neighbors);
    route.push(current);
  }
  return route;
}

export class Simulator {
  constructor() {
    this._adj = buildAdjacency();
    this._trains = new Map();  // trainId → train state
    this._stationBoards = new Map(); // stationId → Set<trainId>
    this._startTime = performance.now();
    this._generateTrains();
  }

  _generateTrains() {
    for (let i = 0; i < CONFIG.SIM_NUM_TRAINS; i++) {
      const type = pick(TRAIN_TYPES);
      const routeLen = type === 'freccia' ? randInt(4, 8) : randInt(2, 5);
      const route = randomRoute(this._adj, routeLen);
      if (route.length < 2) continue;

      const speed = CONFIG.SIM_SPEED_KMH[type];
      const trainNum = `${TYPE_PREFIX[type]} ${randInt(1000, 9999)}`;

      // Compute cumulative distances along route
      const segments = [];
      let totalKm = 0;
      for (let j = 0; j < route.length - 1; j++) {
        const a = stationById.get(route[j]);
        const b = stationById.get(route[j + 1]);
        const km = distanceKm(a.lat, a.lng, b.lat, b.lng);
        segments.push({ from: route[j], to: route[j + 1], km, startKm: totalKm });
        totalKm += km;
      }

      // Schedule: departures spread across the day
      const departHour = rand(5, 23);
      const delayMin = Math.random() < 0.3 ? rand(1, 45) : rand(0, 3);

      const train = {
        id: `T${i}`,
        number: trainNum,
        type,
        route,
        segments,
        totalKm,
        speedKmh: speed,
        departHour,
        delayMin,
        // Dynamic state (updated by _tick)
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

  /** Advance all trains based on elapsed sim time. */
  _tick() {
    // 1 real second = 1 sim minute (so trains visibly move)
    const elapsedMin = (performance.now() - this._startTime) / 1000;
    const simHour = (elapsedMin / 60) % 24;

    for (const train of this._trains.values()) {
      // Is this train active at the current sim hour?
      const tripDurationH = train.totalKm / train.speedKmh;
      const activeStart = train.departHour;
      const activeEnd = (train.departHour + tripDurationH) % 24;

      let active;
      if (activeStart < activeEnd) {
        active = simHour >= activeStart && simHour <= activeEnd;
      } else {
        active = simHour >= activeStart || simHour <= activeEnd; // overnight
      }

      if (!active) {
        train.status = 'inactive';
        continue;
      }
      train.status = 'running';

      // How far along the route?
      let hoursIntoTrip = simHour - activeStart;
      if (hoursIntoTrip < 0) hoursIntoTrip += 24;
      const kmIntoTrip = Math.min(hoursIntoTrip * train.speedKmh, train.totalKm);

      // Find current segment
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

      // Jitter delay occasionally
      if (Math.random() < 0.001) {
        train.delayMin = Math.max(0, train.delayMin + rand(-2, 5));
      }
    }
  }

  // ── Bootstrap: static timetable data (never draws from live budget) ──

  /** Return every train's route + current scheduled position.
   *  This models the "stable timetable" that loads once, for free —
   *  the live API budget is reserved for volatile position/delay deltas. */
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
      });
    }
    return out;
  }

  // ── Simulated API endpoints ──────────────────────────────────────────

  /** GET station board (arrivals or departures). */
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
      const atStation = arrivals
        ? t.nextStation === stationId
        : t.lastStation === stationId;
      if (!atStation) continue;

      results.push({
        trainId: t.id,
        number: t.number,
        type: t.type,
        origin: t.route[0],
        destination: t.route[t.route.length - 1],
        lastStation: t.lastStation,
        nextStation: t.nextStation,
        delayMin: Math.round(t.delayMin),
        scheduledHour: t.departHour,
        status: t.status,
      });
    }
    return results;
  }

  /** GET train progress (posizione). */
  async trainProgress(trainId) {
    await this._latency();
    if (Math.random() < CONFIG.SIM_ERROR_RATE) {
      throw { status: 429, message: 'Too Many Requests' };
    }
    this._tick();

    const t = this._trains.get(trainId);
    if (!t) throw { status: 404, message: 'Not found' };

    return {
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
    };
  }

  /** List all train IDs (for bootstrapping — in real life you'd discover
   *  trains via station boards, but we expose this for initial seeding). */
  allTrainIds() {
    return [...this._trains.keys()];
  }

  _latency() {
    const [lo, hi] = CONFIG.SIM_LATENCY_MS;
    return new Promise(r => setTimeout(r, rand(lo, hi)));
  }
}
