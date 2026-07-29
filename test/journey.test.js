import test from 'node:test';
import assert from 'node:assert/strict';

import { journeyView } from '../src/journey.js';

// Route A(0) → B(1) → C(2); two 20 km segments.
const shuttle = overrides => ({
  route: [0, 1, 2],
  segments: [
    { from: 0, to: 1, km: 20 },
    { from: 1, to: 2, km: 20 },
  ],
  totalKm: 40,
  currentSegIdx: 1,
  progressKm: 30,
  direction: 1,
  lastStation: 99,   // stale sample values — must be ignored when
  nextStation: 99,   // segments are available
  ...overrides,
});

test('outbound leg reports the forward journey', () => {
  const j = journeyView(shuttle({}));

  assert.equal(j.origin, 0);
  assert.equal(j.destination, 2);
  assert.equal(j.lastStation, 1);
  assert.equal(j.nextStation, 2);
  assert.equal(j.legKm, 30);
  assert.equal(j.atTerminus, false);
});

test('return leg reports the journey the train is actually driving', () => {
  const j = journeyView(shuttle({ direction: -1 }));

  assert.equal(j.origin, 2);
  assert.equal(j.destination, 0);
  assert.equal(j.lastStation, 2);   // came from C…
  assert.equal(j.nextStation, 1);   // …heading to B, not "next: C"
  assert.equal(j.legKm, 10);        // 10 km into the return trip
  assert.equal(j.atTerminus, false);
});

test('turnaround at the far terminus faces the return journey', () => {
  const j = journeyView(shuttle({ direction: 0, progressKm: 40, currentSegIdx: 1 }));

  assert.equal(j.origin, 2);
  assert.equal(j.destination, 0);
  assert.equal(j.lastStation, 2);
  assert.equal(j.nextStation, 2);
  assert.equal(j.atTerminus, true);
});

test('turnaround at home faces the outbound journey', () => {
  const j = journeyView(shuttle({ direction: 0, progressKm: 0, currentSegIdx: 0 }));

  assert.equal(j.origin, 0);
  assert.equal(j.destination, 2);
  assert.equal(j.atTerminus, true);
});

test('a placeholder without segments falls back to sampled fields', () => {
  const j = journeyView(shuttle({ segments: null, origin: 5, destination: 7 }));

  assert.equal(j.origin, 5);
  assert.equal(j.destination, 7);
  assert.equal(j.lastStation, 99);
  assert.equal(j.nextStation, 99);
});
