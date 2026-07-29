// ── Web Mercator projection centred on Italy ──────────────────────────

const DEG2RAD = Math.PI / 180;

// Italy bounding box (approx): lng 6.6–18.6, lat 36.6–47.1
const CENTER_LNG = 12.5;
const CENTER_LAT = 41.8;

function mercatorY(lat) {
  const rad = lat * DEG2RAD;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

const CENTER_MERC_Y = mercatorY(CENTER_LAT);

// Scale: map degrees to Three.js world units.
// At 55, Italy spans ~11.5 × ~15 world units — fills the viewport nicely.
const SCALE = 55;

/** Project [lat, lng] → { x, y } on the Three.js plane. */
export function project(lat, lng) {
  const x = (lng - CENTER_LNG) * DEG2RAD * SCALE;
  const y = (mercatorY(lat) - CENTER_MERC_Y) * SCALE;
  return { x, y };
}

/** Unproject Three.js plane { x, y } → { lat, lng }. */
export function unproject(x, y) {
  const lng = x / (DEG2RAD * SCALE) + CENTER_LNG;
  const mercY = y / SCALE + CENTER_MERC_Y;
  const lat = (2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) / DEG2RAD;
  return { lat, lng };
}

/** Great-circle distance in km between two [lat,lng] pairs. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Interpolate position along a segment [lat1,lng1]→[lat2,lng2] by t∈[0,1]. */
export function lerpGeo(lat1, lng1, lat2, lng2, t) {
  return { lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t };
}

/** lat/lng at distance `d` (km) along a polyline (clamped to its ends). */
function pointAtKm(g, cum, d) {
  const total = cum[cum.length - 1];
  d = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (d - cum[i - 1]) / segLen;
  const p0 = g[i - 1], p1 = g[i];
  return { lat: p0[1] + (p1[1] - p0[1]) * t, lng: p0[0] + (p1[0] - p0[0]) * t };
}

/** Position + track heading at distance `d` (km) along a polyline.
 *  g: array of [lng,lat]; cum: cumulative km at each vertex (cum[0]=0).
 *  The heading is the bearing of a ±400 m chord around the point, so it
 *  reflects the local track direction rather than jittering per vertex. */
export function pointAlongGeometry(g, cum, d) {
  const pos = pointAtKm(g, cum, d);
  const W = 0.4;
  const before = pointAtKm(g, cum, d - W);
  const after = pointAtKm(g, cum, d + W);
  const a = project(before.lat, before.lng), b = project(after.lat, after.lng);
  const angle = Math.atan2(b.x - a.x, b.y - a.y);
  return { lat: pos.lat, lng: pos.lng, angle };
}

/** Convert elapsed real seconds to elapsed simulation hours. */
export function simulationHours(elapsedSeconds, timeScale = 1) {
  return elapsedSeconds * timeScale / 3600;
}

/** Normalize an undirected angle to [-π/2, π/2].
 *  Train rectangles are 180°-symmetric, so angles separated by π describe
 *  the same visible orientation. */
function normalizeUndirectedAngle(angle) {
  angle %= Math.PI;
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  return angle;
}

/** Move an undirected heading toward a target by at most `maxStep` radians. */
export function approachUndirectedAngle(current, target, maxStep) {
  const heading = normalizeUndirectedAngle(current);
  const diff = normalizeUndirectedAngle(target - heading);
  const step = Math.max(-maxStep, Math.min(maxStep, diff));
  return normalizeUndirectedAngle(heading + step);
}

/** Normalize a directed angle to [-π, π]. */
function normalizeDirectedAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Heading along the oriented track, flipped for a train on its return leg. */
export function directedTrackHeading(trackAngle, direction) {
  return normalizeDirectedAngle(trackAngle + (direction < 0 ? Math.PI : 0));
}

/** Move a directed heading toward a target by at most `maxStep` radians. */
export function approachDirectedAngle(current, target, maxStep) {
  const heading = normalizeDirectedAngle(current);
  const diff = normalizeDirectedAngle(target - heading);
  const step = Math.max(-maxStep, Math.min(maxStep, diff));
  return normalizeDirectedAngle(heading + step);
}

/** Position of a shuttle service at a given phase (hours since departure).
 *  Models a realistic timetable: run origin→dest, lay over at the terminus,
 *  run dest→origin, lay over, repeat. Position is forecast from schedule +
 *  speed; live delay simply shifts the phase. Returns { km, dir, stopped }:
 *  km along the route, travel direction (+1 out / −1 back / 0 stopped). */
export function shuttlePosition(totalKm, speedKmh, layoverH, phaseH) {
  const tripH = totalKm / speedKmh;
  const cycleH = 2 * (tripH + layoverH);
  const p = ((phaseH % cycleH) + cycleH) % cycleH;
  if (p < tripH) return { km: (p / tripH) * totalKm, dir: 1, stopped: false };
  if (p < tripH + layoverH) return { km: totalKm, dir: 0, stopped: true };
  if (p < 2 * tripH + layoverH) {
    return { km: totalKm - ((p - tripH - layoverH) / tripH) * totalKm, dir: -1, stopped: false };
  }
  return { km: 0, dir: 0, stopped: true };
}
