// ── Map + train renderer ───────────────────────────────────────────────
// Renders, in z-order: land mass + glowing coastline, the full national
// rail network (OSM main + branch), every station as a constant-screen-size
// dot, live trains as direction-aware pointed markers at constant screen size,
// and a 2D label overlay that reveals station names progressively with zoom.
//
// Everything that marks a position (trains, stations) holds a fixed size on
// screen: zooming in separates them spatially instead of growing them, so
// you zoom to see WHERE things are, not to make them bigger.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { project } from './projection.js';
import { STATIONS, stationById } from './stations.js';
import { TRAIN_GLYPH_CONTOUR } from './train-glyph.js';
import { extractRings, loadRailNetwork } from './geo-loader.js';

const C = CONFIG.COLORS;

export class MapRenderer {
  constructor(scene, container) {
    this._sceneObj = scene;
    this._scene = scene.scene;
    this._camera = scene.camera;
    this._container = container;

    this._trainGroup = new THREE.Group();
    this._scene.add(this._trainGroup);

    // Train glyph: a tapered marker whose pointed nose faces +Y.
    const trainShape = new THREE.Shape();
    const [noseStart, ...outline] = TRAIN_GLYPH_CONTOUR;
    trainShape.moveTo(noseStart.x, noseStart.y);
    for (const point of outline) trainShape.lineTo(point.x, point.y);
    trainShape.closePath();
    this._trainGeo = new THREE.ShapeGeometry(trainShape);
    this._trainMeshes = new Map();
    this._clusterMeshes = [];
    this._clusterGeo = new THREE.CircleGeometry(0.18, 20);

    // Selection: pulsing ring around the pinned train + its route drawn
    // on top of the rail network.
    this._selectedId = null;
    this._selRoute = null;
    this._selRing = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.02, 40),
      new THREE.MeshBasicMaterial({ color: C.selection, transparent: true })
    );
    this._selRing.position.z = 0.05;
    this._selRing.visible = false;
    this._scene.add(this._selRing);

    this._initLabelLayer();
  }

  // ── Selection: highlight one train + its full route ──────────────────
  setSelection(t) {
    this.clearSelection();
    if (!t) return;
    this._selectedId = t.id;
    this._selRing.visible = true;
    if (!t.segments) return;
    const verts = [];
    for (const seg of t.segments) {
      for (let i = 0; i < seg.g.length - 1; i++) {
        const a = project(seg.g[i][1], seg.g[i][0]);
        const b = project(seg.g[i + 1][1], seg.g[i + 1][0]);
        verts.push(a.x, a.y, 0.045, b.x, b.y, 0.045);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this._selRoute = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: C.selection, transparent: true, opacity: 0.8 }));
    this._scene.add(this._selRoute);
  }

  clearSelection() {
    this._selectedId = null;
    this._selRing.visible = false;
    if (this._selRoute) {
      this._scene.remove(this._selRoute);
      this._selRoute.geometry.dispose();
      this._selRoute.material.dispose();
      this._selRoute = null;
    }
  }

  _updateSelectionRing(trains, zoom, now) {
    if (!this._selectedId) return;
    const t = trains.find(tr => tr.id === this._selectedId);
    if (!t) { this._selRing.visible = false; return; }
    this._selRing.visible = true;
    this._selRing.position.x = t.x;
    this._selRing.position.y = t.y;
    const pulse = 1 + 0.14 * Math.sin(now * 0.004);
    this._selRing.scale.setScalar((0.28 / zoom) * pulse);
    this._selRing.material.opacity = 0.75 + 0.25 * Math.sin(now * 0.004);
  }

  // ── 2D label overlay (canvas above the WebGL canvas) ─────────────────
  _initLabelLayer() {
    this._labelCanvas = document.createElement('canvas');
    const s = this._labelCanvas.style;
    s.position = 'absolute'; s.top = '0'; s.left = '0';
    s.pointerEvents = 'none'; s.zIndex = '5';
    this._container.appendChild(this._labelCanvas);
    this._labelCtx = this._labelCanvas.getContext('2d');
    this._resizeLabelLayer();
    window.addEventListener('resize', () => this._resizeLabelLayer());
  }

  _resizeLabelLayer() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = this._container.clientWidth, h = this._container.clientHeight;
    this._labelCanvas.width = w * dpr;
    this._labelCanvas.height = h * dpr;
    this._labelCanvas.style.width = w + 'px';
    this._labelCanvas.style.height = h + 'px';
    this._labelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._labelW = w; this._labelH = h;
  }

  // ── Coastline: filled land + glowing border ──────────────────────────
  drawCoastline(geojson) {
    const rings = extractRings(geojson);
    for (const ring of rings) {
      const pts = ring.map(([lng, lat]) => {
        const p = project(lat, lng);
        return new THREE.Vector2(p.x, p.y);
      });
      if (pts.length < 3) continue;

      const shape = new THREE.Shape(pts);
      const fill = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color: C.coastFill, side: THREE.DoubleSide })
      );
      fill.position.z = -0.2;
      this._scene.add(fill);

      const v3 = pts.map(p => new THREE.Vector3(p.x, p.y, 0));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(v3);
      const glow = new THREE.Line(lineGeo,
        new THREE.LineBasicMaterial({ color: C.coastGlow, transparent: true, opacity: 0.5 }));
      glow.position.z = -0.1;
      const edge = new THREE.Line(lineGeo.clone(),
        new THREE.LineBasicMaterial({ color: C.coastline, transparent: true, opacity: 0.9 }));
      edge.position.z = -0.09;
      this._scene.add(glow, edge);
    }
  }

  // ── Full national rail network from bundled OSM geometry ─────────────
  drawRailNetwork() {
    const { main, branch } = loadRailNetwork();
    this._addRailLines(branch, C.railBranch, 0.45, 0.0);
    this._addRailLines(main, C.railMain, 0.75, 0.01);
  }

  _addRailLines(lines, color, opacity, z) {
    const verts = [];
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = project(line[i][1], line[i][0]);
        const b = project(line[i + 1][1], line[i + 1][0]);
        verts.push(a.x, a.y, z, b.x, b.y, z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this._scene.add(new THREE.LineSegments(geo,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
  }

  // ── Stations: constant-screen-size dots (two tiers) ──────────────────
  // sizeAttenuation: false → the dot is always the same pixel size no matter
  // the zoom. Also precomputes projected coords for the label layer.
  drawStations() {
    for (const s of STATIONS) {
      const p = project(s.lat, s.lng);
      s.px = p.x; s.py = p.y;   // cache for the label pass
    }
    this._addStationPoints(STATIONS.filter(s => s.major), C.stationMajor, 7, 1.0);
    this._addStationPoints(STATIONS.filter(s => !s.major), C.station, 3.5, 0.5);
  }

  _addStationPoints(list, color, size, opacity) {
    const pos = new Float32Array(list.length * 3);
    for (let i = 0; i < list.length; i++) {
      pos[i * 3] = list[i].px;
      pos[i * 3 + 1] = list[i].py;
      pos[i * 3 + 2] = 0.03;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, sizeAttenuation: false, transparent: true, opacity,
    })));
  }

  // ── Labels: all names, revealed progressively with zoom, decluttered ──
  updateLabels(zoom) {
    const ctx = this._labelCtx;
    ctx.clearRect(0, 0, this._labelW, this._labelH);

    const cam = this._camera;
    const visW = (cam.right - cam.left) / zoom;
    const visH = (cam.top - cam.bottom) / zoom;
    const panX = cam.position.x, panY = cam.position.y;
    const halfW = visW / 2, halfH = visH / 2;

    // Denser tiers reveal as you zoom in.
    const maxTier = zoom >= CONFIG.LABEL_ZOOM_TIER2 ? 2
      : zoom >= CONFIG.LABEL_ZOOM_TIER1 ? 1 : 0;

    // Screen-space occupancy grid for decluttering.
    const cell = CONFIG.LABEL_MIN_SPACING_PX;
    const used = new Set();

    ctx.textBaseline = 'middle';
    const halfLabelW = this._labelW / 2, halfLabelH = this._labelH / 2;

    // Major hubs first so they win the declutter contest.
    for (let tier = 0; tier <= maxTier; tier++) {
      ctx.font = tier === 0
        ? '700 12px "Space Grotesk", system-ui, sans-serif'
        : '500 10px "Space Grotesk", system-ui, sans-serif';
      ctx.fillStyle = tier === 0 ? 'rgba(205,232,252,0.95)' : 'rgba(150,182,208,0.85)';

      for (const s of STATIONS) {
        if (s.tier !== tier) continue;
        if (s.px < panX - halfW || s.px > panX + halfW ||
            s.py < panY - halfH || s.py > panY + halfH) continue;

        const sx = ((s.px - panX) / visW + 0.5) * this._labelW;
        const sy = (0.5 - (s.py - panY) / visH) * this._labelH;

        // Reserve the label's full width in the occupancy grid so long
        // names never overlap (majors, drawn first, win the contest).
        const tw = ctx.measureText(s.name).width;
        const gx0 = Math.floor((sx + 7) / cell);
        const gx1 = Math.floor((sx + 7 + tw) / cell);
        const gy = Math.floor(sy / cell);
        let clash = false;
        for (let gx = gx0; gx <= gx1; gx++) {
          if (used.has(gx + ',' + gy)) { clash = true; break; }
        }
        if (clash) continue;
        for (let gx = gx0; gx <= gx1; gx++) used.add(gx + ',' + gy);
        ctx.fillText(s.name, sx + 7, sy);
      }
    }
  }

  // ── Trains: pointed directional markers at constant screen size ──────
  updateTrains(trains, zoom) {
    const now = performance.now();
    this._updateSelectionRing(trains, zoom, now);
    if (zoom < CONFIG.LOD_CLUSTER_ZOOM) {
      this._renderClustered(trains, zoom);
      return;
    }
    for (const m of this._clusterMeshes) m.visible = false;

    const glyphScale = 0.28 / zoom;   // constant on-screen size
    const seen = new Set();

    for (const t of trains) {
      seen.add(t.id);
      const age = now - t.lastSample;
      const stale = age > CONFIG.STALE_THRESHOLD_MS;
      const color = stale ? C.trainStale
        : t.delayMin >= CONFIG.DELAY_MAJOR_MIN ? C.trainMajorDelay
        : t.delayMin >= CONFIG.DELAY_MINOR_MIN ? C.trainMinorDelay
        : C.trainOnTime;

      let mesh = this._trainMeshes.get(t.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this._trainGeo,
          new THREE.MeshBasicMaterial({ color, transparent: true }));
        mesh.position.z = 0.06;
        this._trainGroup.add(mesh);
        this._trainMeshes.set(t.id, mesh);
      }
      mesh.material.color.setHex(color);
      mesh.material.opacity = stale ? 0.45 : 1.0;
      mesh.position.x = t.x;
      mesh.position.y = t.y;
      mesh.rotation.z = this._heading(t);
      mesh.scale.setScalar(glyphScale);
      mesh.visible = true;
    }

    for (const [id, mesh] of this._trainMeshes) {
      if (!seen.has(id)) {
        this._trainGroup.remove(mesh);
        this._trainMeshes.delete(id);
      }
    }
  }

  /** Heading (radians) — smoothed in the train store from actual movement. */
  _heading(t) {
    return t.heading ?? 0;
  }

  _renderClustered(trains, zoom) {
    for (const mesh of this._trainMeshes.values()) mesh.visible = false;
    const cellWorld = (CONFIG.LOD_CLUSTER_CELL_PX / this._labelH) *
      (this._camera.top - this._camera.bottom) / zoom;
    const cells = new Map();
    for (const t of trains) {
      const key = `${Math.floor(t.x / cellWorld)},${Math.floor(t.y / cellWorld)}`;
      if (!cells.has(key)) cells.set(key, { x: 0, y: 0, n: 0 });
      const c = cells.get(key);
      c.x += t.x; c.y += t.y; c.n++;
    }
    let idx = 0;
    for (const c of cells.values()) {
      let mesh = this._clusterMeshes[idx];
      if (!mesh) {
        mesh = new THREE.Mesh(this._clusterGeo,
          new THREE.MeshBasicMaterial({ color: C.cluster, transparent: true }));
        mesh.position.z = 0.06;
        this._trainGroup.add(mesh);
        this._clusterMeshes.push(mesh);
      }
      mesh.position.x = c.x / c.n;
      mesh.position.y = c.y / c.n;
      mesh.scale.setScalar(Math.min(3.5, 0.6 + c.n * 0.12) / zoom);
      mesh.material.opacity = Math.min(0.9, 0.45 + c.n * 0.04);
      mesh.visible = true;
      idx++;
    }
    for (let i = idx; i < this._clusterMeshes.length; i++) this._clusterMeshes[i].visible = false;
  }
}
