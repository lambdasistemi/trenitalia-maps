import test from 'node:test';
import assert from 'node:assert/strict';

import { TrainStore } from '../src/train-store.js';

function progressSample(overrides = {}) {
  const segment = {
    from: 0,
    to: 1,
    km: 100,
    g: [[12, 41], [13.2, 41]],
    cum: [0, 100],
    startKm: 0,
  };

  return {
    trainId: 'T-test',
    number: 'R 1000',
    type: 'regionale',
    route: [0, 1],
    segments: [segment],
    totalKm: 100,
    speedKmh: 100,
    lat: 41,
    lng: 12.3,
    progressKm: 25,
    phaseH: 0.25,
    layoverH: 0.5,
    direction: 1,
    trackAngle: Math.PI / 2,
    currentSegIdx: 0,
    delayMin: 0,
    status: 'running',
    origin: 0,
    destination: 1,
    lastStation: 0,
    nextStation: 1,
    ...overrides,
  };
}

test('a station-board placeholder is fully hydrated by train progress', () => {
  const store = new TrainStore();
  const sample = progressSample();

  store.ingestBoard(0, [{
    trainId: sample.trainId,
    number: sample.number,
    type: sample.type,
    delayMin: sample.delayMin,
    status: sample.status,
  }]);
  store.ingestProgress(sample);

  const train = store.get(sample.trainId);
  assert.equal(train.placeholder, false);
  assert.equal(train.segments, sample.segments);
  assert.equal(train.totalKm, sample.totalKm);
  assert.equal(train.phaseH, sample.phaseH);
  assert.equal(train.layoverH, sample.layoverH);
});

test('a delay update does not reposition a running train', () => {
  const store = new TrainStore();
  const sample = progressSample();
  store.seed(sample);
  store.tick();
  const before = store.get(sample.trainId).progressKm;

  store.ingestProgress({
    ...sample,
    phaseH: store.get(sample.trainId).phaseH,
    progressKm: before,
    delayMin: 45,
  });
  store.tick();

  const after = store.get(sample.trainId).progressKm;
  assert.ok(Math.abs(after - before) < 0.05, `${before} → ${after}`);
});

test('an older progress sample cannot rewind motion phase', () => {
  const store = new TrainStore();
  const sample = progressSample({ phaseH: 0.5 });
  store.seed(sample);
  store.tick();
  const before = store.get(sample.trainId).phaseH;

  store.ingestProgress({ ...sample, phaseH: 0.25 });

  assert.ok(store.get(sample.trainId).phaseH >= before);
});
