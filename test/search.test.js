import test from 'node:test';
import assert from 'node:assert/strict';

import { searchAll } from '../src/search.js';

const stations = [
  { id: 0, name: 'Milano Centrale', tier: 0 },
  { id: 1, name: 'Milano Lambrate', tier: 1 },
  { id: 2, name: 'Sesto San Giovanni', tier: 2 },
  { id: 3, name: 'Forlì', tier: 1 },
];
const trains = [
  { id: 'T1', number: 'IC 7096' },
  { id: 'T2', number: 'R 7042' },
];

test('major stations outrank minor ones at equal match quality', () => {
  const r = searchAll('milano', { stations });
  assert.equal(r[0].ref.name, 'Milano Centrale');
  assert.equal(r[1].ref.name, 'Milano Lambrate');
});

test('diacritics are ignored', () => {
  const r = searchAll('forli', { stations });
  assert.equal(r[0].ref.name, 'Forlì');
});

test('trains are found by bare number', () => {
  const r = searchAll('7096', { stations, trains });
  assert.equal(r[0].kind, 'train');
  assert.equal(r[0].ref.id, 'T1');
});

test('trains are found by full designation', () => {
  const r = searchAll('ic 70', { stations, trains });
  assert.equal(r[0].ref.id, 'T1');
});

test('inner word prefixes match stations', () => {
  const r = searchAll('giovanni', { stations });
  assert.equal(r[0].ref.name, 'Sesto San Giovanni');
});

test('empty query yields nothing and limit is respected', () => {
  assert.equal(searchAll('  ', { stations, trains }).length, 0);
  assert.equal(searchAll('a', { stations }, 2).length, 2);
});
