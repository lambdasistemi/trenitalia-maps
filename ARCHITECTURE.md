# ARCHITECTURE.md — Zoom-Invariant Live Train Map of Italy

## Overview

A Three.js single-page application that renders all trains currently moving on
the Italian rail network as a live, zoomable, pannable map. The core design
constraint: **the outbound API request rate is bounded by a fixed global budget
and does not grow with zoom, pan, viewport size, or number of visible trains.**

## The Request-Budget Mechanism

### Token Bucket (`src/rate-limiter.js`)

A single `RateLimiter` instance is the **sole choke point** for every outbound
request. It implements a classic token-bucket:

- **Rate:** `CONFIG.REQUEST_BUDGET_PER_SEC` tokens added per second (default: 5).
- **Burst:** `CONFIG.BUDGET_BURST` max tokens (default: 8), allowing short
  spikes after idle periods but capping sustained throughput.
- **Gate:** `tryConsume()` returns `true` only if a token is available.
  No token → no request. Period.

Nothing else in the system can issue a network call. The scheduler calls
`tryConsume()` before every poll; the API client double-checks. Zoom, pan,
viewport changes, and train count never touch the bucket.

### Backoff & Recovery

On 429 / 5xx responses:
- `shrink(0.5)` halves the effective token refill rate.
- Exponential backoff delays further attempts (`BACKOFF_BASE_MS × 2^n`,
  capped at `BACKOFF_MAX_MS`).

On success:
- `recover(0.1)` restores 10% of the effective rate per successful request,
  smoothly returning to full budget.

## How Zoom Reallocates (Never Inflates) the Budget

### Priority Scheduler (`src/scheduler.js`)

The scheduler maintains a set of **poll targets** (stations and trains), each
scored every tick:

```
score = viewport_priority + staleness_bonus + first_poll_bonus
```

- **Viewport priority:** `+100` if on-screen, `+40` if near-screen (20%
  margin), `+5` if off-screen. Computed from the camera's world-space
  viewport rectangle.
- **Staleness bonus:** `+2 × seconds_since_last_poll`. Least-recently-sampled
  targets naturally rise.
- **First-poll bonus:** `+200` for never-polled targets (bootstrap).

When the user zooms in on Milano, the Milano stations and nearby trains get
`+100` and rise to the top of the queue. When zoomed out to all of Italy,
targets are scored mostly by staleness, producing a round-robin sweep.

**The total number of requests per second is identical in both cases.**
Zoom changes *which* targets get the fixed budget, never *how many*.

### Tick Cadence

The scheduler wakes every `SCHEDULER_TICK_MS` (200ms) and issues at most 2
requests per tick, each gated by `rateLimiter.tryConsume()`. At 5 req/s,
this means most ticks issue 0–1 requests.

## Position Estimation Model

### Dead-Reckoning (`src/train-store.js`)

Between sparse API samples, each train's position is **interpolated** along
its route:

1. On each frame (~60fps), advance `progressKm` by `speedKmh × dt`.
2. Find the current route segment and linearly interpolate lat/lng.
3. Project to Three.js world coordinates.

This produces smooth motion with **zero network cost**. The map animates at
60fps while the network samples at ≤ 5/sec.

### Reconciliation

When a fresh sample arrives, the truth position is stored as `targetLat/Lng`.
Over subsequent frames, the rendered position is blended toward the target:

```
lat += (targetLat - lat) × RECONCILE_ALPHA   // 0.15
```

This prevents teleporting. A train whose sample said "at km 42" but whose
dead-reckoning estimated "km 44" will smoothly slide back over ~10 frames.

### Staleness Visualization

- `age < STALE_THRESHOLD_MS` (60s): full opacity, colored by delay.
- `age > STALE_THRESHOLD_MS`: faded to grey, 40% opacity — visibly uncertain.
- `age > EXPIRE_THRESHOLD_MS` (5min): removed from the map.

## LOD Strategy (Rendering Only)

LOD is a **rendering concern funded by cached state**, never by new API calls.

- **`zoom < LOD_CLUSTER_ZOOM` (0.35):** Trains are grid-clustered in
  world-space. Each cell renders a single bubble sized by count. Individual
  meshes are hidden.
- **`zoom ≥ LOD_CLUSTER_ZOOM`:** Individual train markers, colored by delay
  (green / amber / red) and faded by staleness.

The underlying data is the same in both modes — only the visual aggregation
changes.

## Data Flow

```
Simulator (or real API)
       │
       ▼
  ApiClient ──── rate-limiter gate ──── cache (TTL + coalescing)
       │
       ▼
  Scheduler ──── priority queue ──── viewport-aware scoring
       │
       ▼
  TrainStore ──── dead-reckoning ──── reconciliation
       │
       ▼
  MapRenderer ──── LOD clustering ──── Three.js scene
       │
       ▼
  HUD ──── req/s, budget, cache, staleness
```

## Module Map

| File | Role |
|---|---|
| `config.js` | All tunables as named constants |
| `rate-limiter.js` | Token-bucket: the single request gate |
| `cache.js` | TTL cache + in-flight coalescing |
| `scheduler.js` | Priority queue: viewport-aware, budget-agnostic |
| `api-client.js` | Fetch wrapper: backoff, caching, metrics |
| `simulator.js` | Simulated Trenitalia data source |
| `train-store.js` | Train state, dead-reckoning, reconciliation |
| `scene.js` | Three.js camera, renderer, pan/zoom, eased flyTo |
| `map-renderer.js` | Coastline, rail lines, stations, trains, LOD, selection highlight |
| `hud.js` | Status card (clock, delay counts, network line) + engineering panel |
| `ui.js` | Legend, tooltip, pinned pane, search box, map controls |
| `journey.js` | Direction-aware view of a shuttle's current leg |
| `search.js` | Pure ranking of stations + trains for the search box |
| `projection.js` | Web Mercator lat/lng ↔ world coords, track headings |
| `spatial-index.js` | Grid index for viewport queries |
| `stations.js` | OSM-derived station + edge network with real geometry |
| `geo-loader.js` | Italy GeoJSON fetch + localStorage cache |
| `main.js` | Wiring + game loop |

## Data Source

The app ships with a **simulator** (`simulator.js`) that models ~300 trains
moving on the real Italian rail graph with realistic speeds, schedules, and
delays. It exposes the same interface as the real Trenitalia/RFI endpoints
(`stationBoard`, `trainProgress`).

The real ViaggiaTreno API (`viaggiatreno.it/infomobilita/resteasy/viaggiatreno/`)
is HTTP-only and lacks CORS headers, making direct browser access impractical.
To use the real API, deploy a thin CORS proxy and swap `Simulator` for a
`fetch`-based implementation in `ApiClient`.

## Tunables

All in `src/config.js`:

- `REQUEST_BUDGET_PER_SEC` — the hard ceiling (default: 5)
- `BUDGET_BURST` — token-bucket capacity (default: 8)
- `SCHEDULER_TICK_MS` — scheduler wake interval (default: 200ms)
- `CACHE_TTL_*` — per-endpoint TTLs
- `BACKOFF_*` — shrink/recover factors
- `STALE_THRESHOLD_MS` / `EXPIRE_THRESHOLD_MS` — staleness rendering
- `RECONCILE_ALPHA` — blend speed for position reconciliation
- `LOD_CLUSTER_ZOOM` / `LOD_CLUSTER_CELL_PX` — clustering thresholds
- `SIM_*` — simulator parameters
