// ── Map + train renderer ───────────────────────────────────────────────
// Renders, in z-order: sea backdrop, land mass + glowing coastline, the
// full national rail network (OSM main + branch), stations + labels, and
// live trains as direction-aware chevrons coloured by delay.
//
// LOD (clustering) is a RENDERING concern only — it never triggers calls.

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG } from './config.js';
import { project } from './projection.js';
import { STATIONS, stationById } from './stations.js';
import { extractRings, loadRailNetwork } from './geo-loader.js';

const C = CONFIG.COLORS;

export class MapRenderer {
  constructor(scene) {
    this._sceneObj = scene;
    this._scene = scene.scene;
    this._camera = scene.camera;

    this._trainGroup = new THREE.Group();
    this._scene.add(this._trainGroup);

    // ── Shared train chevron geometry (points +Y, centred) ──
    const s = new THREE.Shape();
    s.moveTo(0, 0.62);
    s.lineTo(0.36, -0.42);
    s.lineTo(0, -0.14);
    s.lineTo(-0.36, -0.42);
    s.closePath();
    this._chevronGeo = new THREE.ShapeGeometry(s);
    this._glowGeo = new THREE.CircleGeometry(0.62, 16);

    this._trainMeshes = new Map();   // id → { arrow, glow }
    this._clusterMeshes = [];
    this._clusterGeo = new THREE.CircleGeometry(0.18, 20);

    this._labels = [];               // CSS2DObjects for declutter pass
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

      // Land fill
      const shape = new THREE.Shape(pts);
      const fill = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color: C.coastFill, side: THREE.DoubleSide })
      );
      fill.position.z = -0.2;
      this._scene.add(fill);

      // Glowing border: wide faint stroke + thin bright stroke
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
    this._addRailLines(branch, C.railBranch, 0.45, 0.0);   // branch: dim, below
    this._addRailLines(main, C.railMain, 0.75, 0.01);       // main: bright, above
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
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    this._scene.add(new THREE.LineSegments(geo, mat));
  }

  // ── Stations + always-on labels (major hubs) ─────────────────────────
  drawStations() {
    for (const st of STATIONS) {
      const p = project(st.lat, st.lng);
      const size = st.major ? 0.11 : 0.06;
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(size, 12),
        new THREE.MeshBasicMaterial({
          color: st.major ? C.stationMajor : C.station,
          transparent: true, opacity: st.major ? 1 : 0.7,
        })
      );
      dot.position.set(p.x, p.y, 0.03);
      this._scene.add(dot);

      if (st.major) {
        const el = document.createElement('div');
        el.className = 'station-label';
        el.textContent = st.name;
        const label = new CSS2DObject(el);
        label.position.set(p.x, p.y, 0.04);
        label.userData = { x: p.x, y: p.y, el };
        this._scene.add(label);
        this._labels.push(label);
      }
    }
  }

  /** Declutter labels: hide overlapping ones, prioritising hubs. */
  updateLabels(zoom) {
    const placed = [];
    const minDist = 46 / zoom; // world-space exclusion radius
    // Major hubs first (they're all major here); sort top-to-bottom for stability.
    const sorted = [...this._labels].sort((a, b) => b.userData.y - a.userData.y);
    for (const label of sorted) {
      const { x, y, el } = label.userData;
      const clash = placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist);
      el.style.display = clash ? 'none' : 'block';
      if (!clash) placed.push({ x, y });
    }
  }

  // ── Trains: direction-aware chevrons, delay colour, glow ─────────────
  updateTrains(trains, zoom) {
    const now = performance.now();
    if (zoom < CONFIG.LOD_CLUSTER_ZOOM) {
      this._renderClustered(trains, zoom);
      return;
    }
    for (const m of this._clusterMeshes) m.visible = false;

    const glyphScale = 0.30 / zoom;   // constant on-screen size
    const seen = new Set();

    for (const t of trains) {
      seen.add(t.id);
      const age = now - t.lastSample;
      const stale = age > CONFIG.STALE_THRESHOLD_MS;
      const color = stale ? C.trainStale
        : t.delayMin >= CONFIG.DELAY_MAJOR_MIN ? C.trainMajorDelay
        : t.delayMin >= CONFIG.DELAY_MINOR_MIN ? C.trainMinorDelay
        : C.trainOnTime;

      let entry = this._trainMeshes.get(t.id);
      if (!entry) {
        const arrow = new THREE.Mesh(this._chevronGeo,
          new THREE.MeshBasicMaterial({ color, transparent: true }));
        const glow = new THREE.Mesh(this._glowGeo,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 }));
        arrow.position.z = 0.06;
        glow.position.z = 0.05;
        this._trainGroup.add(glow, arrow);
        entry = { arrow, glow };
        this._trainMeshes.set(t.id, entry);
      }

      const { arrow, glow } = entry;
      arrow.material.color.setHex(color);
      glow.material.color.setHex(color);
      arrow.material.opacity = stale ? 0.4 : 1.0;
      glow.material.opacity = stale ? 0.06 : 0.18;

      arrow.position.x = glow.position.x = t.x;
      arrow.position.y = glow.position.y = t.y;
      arrow.rotation.z = this._heading(t);
      arrow.scale.setScalar(glyphScale);
      glow.scale.setScalar(glyphScale * 1.6);
      arrow.visible = glow.visible = true;
    }

    for (const [id, entry] of this._trainMeshes) {
      if (!seen.has(id)) {
        this._trainGroup.remove(entry.arrow, entry.glow);
        this._trainMeshes.delete(id);
      }
    }
  }

  /** Heading (radians) from the train's current segment direction. */
  _heading(t) {
    if (!t.segments || !t.segments.length) return 0;
    const seg = t.segments[Math.min(t.currentSegIdx ?? 0, t.segments.length - 1)];
    const a = stationById.get(seg.from);
    const b = stationById.get(seg.to);
    if (!a || !b) return 0;
    const pa = project(a.lat, a.lng);
    const pb = project(b.lat, b.lng);
    // Chevron points +Y; rotate so +Y aligns with travel direction.
    return Math.atan2(pb.x - pa.x, pb.y - pa.y);
  }

  _renderClustered(trains, zoom) {
    for (const entry of this._trainMeshes.values()) {
      entry.arrow.visible = false;
      entry.glow.visible = false;
    }
    const cellWorld = (CONFIG.LOD_CLUSTER_CELL_PX / this._sceneObj._height) *
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
