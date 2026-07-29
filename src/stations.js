// ── Italian rail network (rail-aligned) ────────────────────────────────
// Stations sourced from OpenStreetMap (railway=station / railway=halt)
// merged with curated major hubs, each snapped onto the tracks. Every edge
// carries the real rail geometry between its stations, so trains follow the
// actual lines instead of straight chords. Bundled + offline-first.
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

// Edges: { a, b, km, g: [[lng,lat],...] } — geometry runs a → b.
export const EDGES = network.edges;

export const stationById = new Map(STATIONS.map(s => [s.id, s]));

/** Adjacency list: station index → [{ to, e }] (neighbour + edge index). */
export function buildAdjacency() {
  const adj = new Array(STATIONS.length);
  for (let i = 0; i < adj.length; i++) adj[i] = [];
  EDGES.forEach((edge, e) => {
    adj[edge.a].push({ to: edge.b, e });
    adj[edge.b].push({ to: edge.a, e });
  });
  return adj;
}
