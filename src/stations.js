// ── Italian rail network: 6,877 real stations + 8,338 segments ─────────
// Sourced from OpenStreetMap (railway=station / railway=halt) merged with
// a curated set of major hubs. Loaded from a bundled, precomputed network
// so the full map is available offline from the first frame.
//
// Station tiers: 0 = major hub (curated), 1 = OSM station, 2 = OSM halt.

import network from './network.json';

export const STATIONS = network.stations.map((s, i) => ({
  id: i,
  name: s.n,
  lat: s.la,
  lng: s.lo,
  tier: s.t,
  major: s.t === 0,
}));

// Edges are pairs of station indices.
export const CONNECTIONS = network.edges;

export const stationById = new Map(STATIONS.map(s => [s.id, s]));

/** Adjacency list: station index → array of neighbour indices. */
export function buildAdjacency() {
  const adj = new Array(STATIONS.length);
  for (let i = 0; i < adj.length; i++) adj[i] = [];
  for (const [a, b] of CONNECTIONS) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}
