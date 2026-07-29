// ── Grid-based spatial index for viewport culling & priority queries ───

export class SpatialIndex {
  constructor(cellSize = 0.5) {
    this._cell = cellSize;
    this._grid = new Map(); // "cx,cy" → Set<item>
    this._itemCell = new Map(); // item → "cx,cy"
  }

  _key(x, y) {
    return `${Math.floor(x / this._cell)},${Math.floor(y / this._cell)}`;
  }

  insert(item, x, y) {
    const key = this._key(x, y);
    if (!this._grid.has(key)) this._grid.set(key, new Set());
    this._grid.get(key).add(item);
    this._itemCell.set(item, key);
  }

  remove(item) {
    const key = this._itemCell.get(item);
    if (key && this._grid.has(key)) {
      this._grid.get(key).delete(item);
      if (this._grid.get(key).size === 0) this._grid.delete(key);
    }
    this._itemCell.delete(item);
  }

  update(item, x, y) {
    this.remove(item);
    this.insert(item, x, y);
  }

  /** Query all items within a rectangular region. */
  queryRect(x0, y0, x1, y1) {
    const results = [];
    const cx0 = Math.floor(Math.min(x0, x1) / this._cell);
    const cy0 = Math.floor(Math.min(y0, y1) / this._cell);
    const cx1 = Math.floor(Math.max(x0, x1) / this._cell);
    const cy1 = Math.floor(Math.max(y0, y1) / this._cell);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const cell = this._grid.get(`${cx},${cy}`);
        if (cell) results.push(...cell);
      }
    }
    return results;
  }

  clear() {
    this._grid.clear();
    this._itemCell.clear();
  }
}
