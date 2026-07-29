// ── Italy geometry: bundled, offline-first ─────────────────────────────
// The national outline is shipped with the app (src/italy.geo.json,
// simplified from geoBoundaries/Natural Earth). No runtime fetch, no
// network dependency, and it never draws from the live API budget.

import italyGeo from './italy.geo.json';
import railGeo from './rail.geo.json';

/** Load Italy boundary GeoJSON. Bundled — resolves immediately. */
export async function loadItalyGeo() {
  return italyGeo;
}

/** The full national rail network (OSM main + branch lines), bundled.
 *  Returns { main: [[lng,lat],...][], branch: [...] } as arrays of lines. */
export function loadRailNetwork() {
  const main = [];
  const branch = [];
  for (const f of railGeo.features) {
    const lines = f.geometry.coordinates; // MultiLineString
    const target = f.properties.c === 1 ? main : branch;
    for (const line of lines) target.push(line);
  }
  return { main, branch };
}

/** Extract all coordinate rings from the GeoJSON as arrays of [lng,lat]. */
export function extractRings(geojson) {
  const rings = [];
  const walk = (coords) => {
    if (typeof coords[0] === 'number') return;
    if (typeof coords[0][0] === 'number') { rings.push(coords); return; }
    coords.forEach(walk);
  };
  const features = geojson.features ?? [geojson];
  for (const feature of features) {
    const geom = feature.geometry ?? feature;
    if (!geom) continue;
    if (geom.type === 'Polygon') walk(geom.coordinates);
    else if (geom.type === 'MultiPolygon') walk(geom.coordinates);
  }
  return rings;
}
