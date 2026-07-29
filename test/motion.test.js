import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approachUndirectedAngle,
  pointAlongGeometry,
  simulationHours,
  shuttlePosition,
} from '../src/projection.js';
import { randomSimpleRoute } from '../src/route.js';

/** Direction the +Y glyph nose points after mesh.rotation.z = angle (CCW). */
const noseVector = angle => [-Math.sin(angle), Math.cos(angle)];

const deg = value => value * Math.PI / 180;

test('one real hour advances one simulation hour at 1x', () => {
  assert.equal(simulationHours(3600, 1), 1);
});

test('a 200 km/h train advances at 200 km/h at 1x', () => {
  const elapsedH = simulationHours(10, 1);
  const position = shuttlePosition(1000, 200, 0.25, elapsedH);

  assert.ok(Math.abs(position.km - 200 * 10 / 3600) < 1e-12);
});

test('undirected heading takes the short path across the 180-degree seam', () => {
  const next = approachUndirectedAngle(deg(89), deg(-89), deg(1));
  const undirectedDistance = (a, b) => Math.acos(Math.abs(Math.cos(a - b)));

  assert.ok(Math.abs(undirectedDistance(deg(89), next) - deg(1)) < 1e-12);
  assert.ok(Math.abs(undirectedDistance(next, deg(-89)) - deg(1)) < 1e-12);
});

test('a train moving east renders with its nose pointing east', () => {
  // Straight west→east track at constant latitude. World x grows with lng.
  const g = [[12.0, 41.8], [12.5, 41.8], [13.0, 41.8]];
  const cum = [0, 41, 82];   // approx km, only relative spacing matters
  const { angle } = pointAlongGeometry(g, cum, 41);
  const [nx] = noseVector(angle);

  assert.ok(nx > 0.99, `nose x=${nx}, expected ~1 (east)`);
});

test('a train moving north renders with its nose pointing north', () => {
  const g = [[12.5, 41.0], [12.5, 41.5], [12.5, 42.0]];
  const cum = [0, 55, 110];
  const { angle } = pointAlongGeometry(g, cum, 55);
  const [, ny] = noseVector(angle);

  assert.ok(ny > 0.99, `nose y=${ny}, expected ~1 (north)`);
});

test('generated routes never revisit a station', () => {
  const adjacency = [
    [{ to: 1, e: 0 }],
    [{ to: 0, e: 0 }, { to: 2, e: 1 }],
    [{ to: 1, e: 1 }, { to: 3, e: 2 }],
    [{ to: 2, e: 2 }],
  ];
  const { route, edgeIdxs } = randomSimpleRoute({
    adjacency,
    starts: [0],
    length: 8,
    maxTier: 2,
    tierOf: () => 1,
    random: () => 0,
  });

  assert.deepEqual(route, [0, 1, 2, 3]);
  assert.deepEqual(edgeIdxs, [0, 1, 2]);
  assert.equal(new Set(route).size, route.length);
});
