import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approachUndirectedAngle,
  simulationHours,
  shuttlePosition,
} from '../src/projection.js';
import { randomSimpleRoute } from '../src/route.js';

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
