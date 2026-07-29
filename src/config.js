// ── All tunables in one place ──────────────────────────────────────────

export const CONFIG = {
  // ── Request budget (the graded invariant) ──────────────────────────
  // Hard global ceiling: max outbound requests in ANY 1-second window.
  // Enforced by a sliding-window limiter that can never spike above this.
  // Everything draws from this single budget. Zoom changes allocation,
  // never this number.
  REQUEST_BUDGET_PER_SEC: 5,

  // ── Scheduler ──────────────────────────────────────────────────────
  // How often the scheduler wakes up to consider issuing a request.
  SCHEDULER_TICK_MS: 200,

  // Priority weights (higher = polled sooner).
  PRIORITY_ONSCREEN: 100,
  PRIORITY_NEARSCREEN: 40,
  PRIORITY_OFFSCREEN: 5,
  PRIORITY_STALE_BONUS_PER_SEC: 2,   // +2 priority per second of staleness
  PRIORITY_DELAY_VOLATILITY: 30,     // bonus for high-delay trains
  PRIORITY_HIGH_SPEED: 15,           // bonus for fast trains (Freccia*)

  // ── Cache ──────────────────────────────────────────────────────────
  CACHE_TTL_STATION_BOARD_MS: 30_000,   // station boards: 30s
  CACHE_TTL_TRAIN_PROGRESS_MS: 15_000,  // train progress: 15s
  CACHE_TTL_STATIC_MS: 3_600_000,       // static data: 1h

  // ── Backoff ────────────────────────────────────────────────────────
  BACKOFF_BASE_MS: 1_000,
  BACKOFF_MAX_MS: 30_000,
  BACKOFF_MULTIPLIER: 2,
  // On 429/5xx, shrink effective budget by this factor; recover slowly.
  BACKOFF_BUDGET_SHRINK: 0.5,
  BACKOFF_BUDGET_RECOVER_RATE: 0.1, // recover 10% per successful request

  // ── Interpolation / dead-reckoning ─────────────────────────────────
  // Max age (ms) before a train is rendered as "uncertain".
  STALE_THRESHOLD_MS: 60_000,
  // Max age before a train is removed from the map entirely.
  EXPIRE_THRESHOLD_MS: 300_000,
  // Reconciliation: how quickly estimated position snaps to fresh sample.
  // 0 = instant teleport, 1 = never reconcile. Lower = snappier.
  RECONCILE_ALPHA: 0.15,

  // ── LOD (rendering only — never affects API rate) ──────────────────
  // Zoom level below which trains cluster.
  LOD_CLUSTER_ZOOM: 0.35,
  // Screen-space grid cell size (px) for clustering.
  LOD_CLUSTER_CELL_PX: 50,
  // Progressive station labels: zoom at which each tier appears.
  // Tier 0 (major hubs) is always on; city stations show at the default
  // national view, and every halt reveals as you zoom into a region.
  LABEL_ZOOM_TIER1: 0.7,
  LABEL_ZOOM_TIER2: 2.2,
  // Minimum on-screen spacing (px) between visible labels (declutter).
  LABEL_MIN_SPACING_PX: 60,
  // Below this zoom, hide minor stations entirely.
  LOD_MINOR_STATION_ZOOM: 0.45,

  // ── Rendering ──────────────────────────────────────────────────────
  MAP_MIN_ZOOM: 0.3,
  MAP_MAX_ZOOM: 160,
  TRAIN_POINT_SIZE: 8,
  STATION_POINT_SIZE: 4,
  // Delay colour breakpoints (minutes). Documented scale, see legend.
  DELAY_MINOR_MIN: 5,
  DELAY_MAJOR_MIN: 20,
  COLORS: {
    background: 0x070d16,      // deep sea navy
    seaGlow: 0x0a1626,
    coastFill: 0x101c2b,       // land mass
    coastFillEdge: 0x16283c,
    coastline: 0x2f6f9f,       // coastline stroke
    coastGlow: 0x1c4a6e,
    railMain: 0x4a7ba6,        // main lines — brighter
    railBranch: 0x2c4a66,      // branch lines — dimmer
    station: 0x6a94b8,
    stationMajor: 0xaad4f5,
    trainOnTime: 0x34d399,     // green
    trainMinorDelay: 0xfbbf24, // amber
    trainMajorDelay: 0xf87171, // red
    trainStale: 0x5b6b7b,      // grey — uncertain
    cluster: 0x38bdf8,
    hudAccent: 0x38bdf8,
    selection: 0x38bdf8,   // pinned train ring + route highlight
  },

  // ── Simulator ──────────────────────────────────────────────────────
  SIM_NUM_TRAINS: 700,
  // Sim clock starts at a busy hour so the map is dense from frame one.
  SIM_START_HOUR: 8,
  // Simulation clock multiplier. Keep this at 1 so the distance covered on
  // screen agrees with the speed shown in the train details.
  SIM_TIME_SCALE: 1,
  // Turnaround layover at each terminus (hours), so a service pauses at the
  // end of its run instead of instantly reversing.
  SIM_LAYOVER_H: [0.2, 0.5],
  SIM_LATENCY_MS: [40, 180],       // random latency range
  SIM_ERROR_RATE: 0.03,            // 3% chance of 429
  // Realistic service speeds (km/h).
  SIM_SPEED_KMH: { regionale: 90, intercity: 140, freccia: 200 },

  // ── Track snapping ─────────────────────────────────────────────────
  // Snap a train onto the nearest real rail line if one is within this many
  // world units (~1 world unit ≈ 84 km), so forecast positions stay on the
  // visible tracks. Beyond this, keep the straight-line forecast.
  SNAP_MAX_WORLD: 0.18,
};
