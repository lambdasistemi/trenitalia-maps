import test from 'node:test';
import assert from 'node:assert/strict';

import { CONFIG } from '../src/config.js';
import {
  approachDirectedAngle,
  directedTrackHeading,
} from '../src/projection.js';
import { TRAIN_GLYPH_CONTOUR } from '../src/train-glyph.js';

const deg = value => value * Math.PI / 180;
const directedDistance = (a, b) => Math.acos(Math.cos(a - b));

test('map zoom reaches a station-level inspection view', () => {
  assert.ok(CONFIG.MAP_MAX_ZOOM >= 100);
});

test('reverse-running trains point opposite the track geometry', () => {
  assert.ok(directedDistance(directedTrackHeading(deg(20), 1), deg(20)) < 1e-12);
  assert.ok(directedDistance(directedTrackHeading(deg(20), -1), deg(-160)) < 1e-12);
});

test('directed heading takes the short path across the 360-degree seam', () => {
  const next = approachDirectedAngle(deg(179), deg(-179), deg(1));

  assert.ok(Math.abs(directedDistance(deg(179), next) - deg(1)) < 1e-12);
  assert.ok(Math.abs(directedDistance(next, deg(-179)) - deg(1)) < 1e-12);
});

test('train marker has one pointed nose and a flat tail', () => {
  const maxY = Math.max(...TRAIN_GLYPH_CONTOUR.map(point => point.y));
  const minY = Math.min(...TRAIN_GLYPH_CONTOUR.map(point => point.y));

  assert.equal(TRAIN_GLYPH_CONTOUR.filter(point => point.y === maxY).length, 1);
  assert.equal(TRAIN_GLYPH_CONTOUR.filter(point => point.y === minY).length, 2);
});
