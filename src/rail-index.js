// ── Rail spatial index ─────────────────────────────────────────────────
// Lets a train snap its forecast (straight-line) position onto the nearest
// real track, so trains follow the visible rail geometry instead of cutting
// chords across the countryside. Also yields the track bearing for heading.

import { project } from './projection.js';

function pointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return { x: cx, y: cy, d: Math.hypot(px - cx, py - cy), t };
}

export class RailIndex {
  constructor(lines, cell = 0.25) {
    this._cell = cell;
    this._grid = new Map();
    this._segs = [];
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = project(line[i][1], line[i][0]);
        const b = project(line[i + 1][1], line[i + 1][0]);
        const seg = { ax: a.x, ay: a.y, bx: b.x, by: b.y };
        this._segs.push(seg);
        this._add(seg.ax, seg.ay, seg);
        this._add(seg.bx, seg.by, seg);
      }
    }
  }

  _add(x, y, seg) {
    const k = Math.floor(x / this._cell) + '_' + Math.floor(y / this._cell);
    let cell = this._grid.get(k);
    if (!cell) this._grid.set(k, cell = []);
    cell.push(seg);
  }

  /** Nearest point on the rail network to (x,y).
   *  Returns { x, y, angle, dist } — snapped point, track bearing, distance. */
  nearest(x, y) {
    const cx = Math.floor(x / this._cell), cy = Math.floor(y / this._cell);
    let best = null, bestD = Infinity;
    const seen = new Set();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this._grid.get((cx + dx) + '_' + (cy + dy));
        if (!cell) continue;
        for (const seg of cell) {
          if (seen.has(seg)) continue;
          seen.add(seg);
          const p = pointToSegment(x, y, seg.ax, seg.ay, seg.bx, seg.by);
          if (p.d < bestD) {
            bestD = p.d;
            best = { x: p.x, y: p.y, angle: Math.atan2(seg.bx - seg.ax, seg.by - seg.ay), dist: p.d };
          }
        }
      }
    }
    return best ?? { x, y, angle: 0, dist: Infinity };
  }
}
