// ── Three.js scene: camera, renderers, pan/zoom controls ───────────────

import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CONFIG } from './config.js';

export class Scene {
  constructor(container) {
    this._container = container;
    this._width = container.clientWidth;
    this._height = container.clientHeight;

    // ── WebGL renderer ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(this._width, this._height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(CONFIG.COLORS.background);
    container.appendChild(this.renderer.domElement);

    // ── CSS2D renderer (crisp DOM labels + tooltips overlaid on the map) ──
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this._width, this._height);
    const ls = this.labelRenderer.domElement.style;
    ls.position = 'absolute';
    ls.top = '0';
    ls.left = '0';
    ls.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    // ── Scene ──
    this.scene = new THREE.Scene();

    // ── Orthographic camera (top-down map) ──
    const aspect = this._width / this._height;
    const frustum = 16;
    this._frustum = frustum;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect / 2, frustum * aspect / 2,
      frustum / 2, -frustum / 2, 0.1, 100
    );
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom = 1.0;
    this.camera.updateProjectionMatrix();

    // ── Pan / zoom state ──
    this._panX = 0;
    this._panY = 0;
    this._dragging = false;
    this._moved = false;
    this._lastMouse = { x: 0, y: 0 };

    this._bindControls();
    window.addEventListener('resize', () => this._onResize());
  }

  _bindControls() {
    const el = this.renderer.domElement;

    // Zoom toward the cursor
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const before = this._screenToWorld(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 0.88 : 1.136;
      this.camera.zoom = Math.max(0.3, Math.min(20, this.camera.zoom * factor));
      this.camera.updateProjectionMatrix();
      const after = this._screenToWorld(e.clientX, e.clientY);
      this._panX += before.x - after.x;
      this._panY += before.y - after.y;
      this._applyPan();
    }, { passive: false });

    el.addEventListener('pointerdown', (e) => {
      this._dragging = true;
      this._moved = false;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this._moved = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      const scale = this._frustum / (this.camera.zoom * this._height);
      this._panX -= dx * scale;
      this._panY += dy * scale;
      this._applyPan();
    });

    el.addEventListener('pointerup', () => { this._dragging = false; });
    el.addEventListener('pointercancel', () => { this._dragging = false; });
  }

  _applyPan() {
    this.camera.position.x = this._panX;
    this.camera.position.y = this._panY;
    this.camera.lookAt(this._panX, this._panY, 0);
  }

  /** Client-pixel → world coordinate. */
  _screenToWorld(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const v = new THREE.Vector3(nx, ny, 0).unproject(this.camera);
    return { x: v.x, y: v.y };
  }

  screenToWorld(clientX, clientY) {
    return this._screenToWorld(clientX, clientY);
  }

  /** World → client-pixel (for DOM tooltips). */
  worldToScreen(x, y) {
    const v = new THREE.Vector3(x, y, 0).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((v.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - v.y) / 2) * rect.height,
    };
  }

  _onResize() {
    this._width = this._container.clientWidth;
    this._height = this._container.clientHeight;
    this.renderer.setSize(this._width, this._height);
    this.labelRenderer.setSize(this._width, this._height);
    const aspect = this._width / this._height;
    this.camera.left = -this._frustum * aspect / 2;
    this.camera.right = this._frustum * aspect / 2;
    this.camera.top = this._frustum / 2;
    this.camera.bottom = -this._frustum / 2;
    this.camera.updateProjectionMatrix();
  }

  getViewport() {
    const hw = (this.camera.right - this.camera.left) / 2 / this.camera.zoom;
    const hh = (this.camera.top - this.camera.bottom) / 2 / this.camera.zoom;
    return { x0: this._panX - hw, y0: this._panY - hh, x1: this._panX + hw, y1: this._panY + hh };
  }

  get zoom() { return this.camera.zoom; }
  get didDrag() { return this._moved; }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}
