// ── Main: wire everything together ──────────────────────────────────────

import { CONFIG } from './config.js';
import { RateLimiter } from './rate-limiter.js';
import { Cache } from './cache.js';
import { Simulator } from './simulator.js';
import { ApiClient } from './api-client.js';
import { Scheduler } from './scheduler.js';
import { TrainStore } from './train-store.js';
import { Scene } from './scene.js';
import { MapRenderer } from './map-renderer.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';
import { STATIONS } from './stations.js';
import { project } from './projection.js';
import { loadItalyGeo } from './geo-loader.js';

async function main() {
  const container = document.getElementById('app');

  // ── Core infrastructure ──
  const rateLimiter = new RateLimiter(CONFIG.REQUEST_BUDGET_PER_SEC);
  const cache = new Cache();
  const simulator = new Simulator();
  const apiClient = new ApiClient(simulator, rateLimiter, cache);
  const trainStore = new TrainStore();
  window.__trains = trainStore; // debug hook for verification

  // ── Rendering + UI ──
  const scene = new Scene(container);
  window.__mapScene = scene; // debug hook for verification
  const mapRenderer = new MapRenderer(scene, container);
  const hud = new HUD();
  const ui = new UI();

  // ── Static map (loads instantly, never draws from the live budget) ──
  mapRenderer.drawCoastline(await loadItalyGeo());
  mapRenderer.drawRailNetwork();
  mapRenderer.drawStations();

  // ── Bootstrap: seed every train from the timetable (free, one-time) ──
  // The map is fully alive from frame one. The live budget below is spent
  // only on refreshing volatile position/delay deltas.
  for (const t of simulator.bootstrapTimetable()) {
    trainStore.seed(t);
  }

  // ── Scheduler: spends the bounded budget on live refreshes ──
  // Only major hubs are board-polled (all 6,877 stations would flood the
  // queue and starve train updates); every train is progress-polled.
  const scheduler = new Scheduler(apiClient, rateLimiter);
  for (const s of STATIONS) {
    if (!s.major) continue;
    scheduler.addStation(s.id, s.px, s.py);
  }
  for (const t of trainStore.all()) {
    scheduler.addTrain(t.id);
    scheduler.setTrainPosition(t.id, t.x, t.y);
  }

  scheduler.onSample((kind, id, data) => {
    if (kind === 'train') {
      trainStore.ingestProgress(data);
      if (data.lat != null) {
        const p = project(data.lat, data.lng);
        scheduler.setTrainPosition(id, p.x, p.y);
      }
    } else if (kind === 'station' && Array.isArray(data)) {
      trainStore.ingestBoard(id, data);
      for (const entry of data) scheduler.addTrain(entry.trainId);
    }
  });

  // ── Interaction: hover tooltip + click-to-pin (screen-space picking) ──
  const PICK_PX = 14;
  function pickTrain(clientX, clientY) {
    let best = null, bestD = PICK_PX;
    for (const t of trainStore.all()) {
      const sp = scene.worldToScreen(t.x, t.y);
      const d = Math.hypot(sp.x - clientX, sp.y - clientY);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  const el = scene.renderer.domElement;
  ui.onUnpin = () => mapRenderer.clearSelection();
  ui.buildMapControls({
    onZoomIn: () => scene.zoomBy(1.5),
    onZoomOut: () => scene.zoomBy(1 / 1.5),
    onFit: () => scene.fitItaly(),
  });
  el.addEventListener('pointermove', (e) => {
    if (scene.didDrag) { ui.hideTooltip(); return; }
    const t = pickTrain(e.clientX, e.clientY);
    if (t && t.id !== ui.pinnedId) ui.showTooltip(t, e.clientX, e.clientY);
    else ui.hideTooltip();
    el.style.cursor = t ? 'pointer' : 'grab';
  });
  el.addEventListener('pointerdown', () => { el.style.cursor = 'grabbing'; });
  el.addEventListener('click', (e) => {
    if (scene.didDrag) return;
    const t = pickTrain(e.clientX, e.clientY);
    if (t) {
      ui.pin(t);
      mapRenderer.setSelection(t);
      ui.hideTooltip();
    } else {
      ui.unpin();   // click on empty map deselects
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ui.unpin();
  });

  // ── Main loop ──
  function frame() {
    trainStore.tick();

    const vp = scene.getViewport();
    scheduler.setViewport(vp.x0, vp.y0, vp.x1, vp.y1);
    for (const t of trainStore.all()) scheduler.setTrainPosition(t.id, t.x, t.y);

    mapRenderer.updateTrains(trainStore.all(), scene.zoom);
    mapRenderer.updateLabels(scene.zoom);

    // Keep the pinned pane tracking its live train; drop it if expired
    if (ui.pinnedId) {
      const pinned = trainStore.get(ui.pinnedId);
      if (pinned) ui.updatePane(pinned);
      else ui.unpin();
    }

    hud.update({ rateLimiter, cache, trainStore, scheduler, apiClient, simulator });
    scene.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
