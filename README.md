# Trenitalia Live Map

A zoomable, pannable live map of the Italian rail network rendered with
Three.js. Every train currently running is drawn as a direction-aware marker
following the real track geometry, colored by delay, fed by a simulated
Trenitalia API behind a hard request budget.

Live: https://lambdasistemi.github.io/trenitalia-maps/

## Run

```
npm ci
npm run dev      # dev server
npm test         # node --test suite
npm run build    # production build in dist/
```

## Interactions

- drag to pan, scroll / double-click to zoom, `+` `−` `⌂` buttons bottom-right
- hover a train for a summary, click to pin its journey pane
  (route highlighted on the map, `Esc` or empty click to dismiss)
- `D` toggles the engineering panel (request budget, cache, scheduler,
  staleness)

## Design

The core constraint — outbound API request rate is bounded by a fixed global
budget that does not grow with zoom, pan, viewport, or train count — and the
architecture serving it (token-bucket limiter, priority scheduler,
dead-reckoning, LOD) are documented in [ARCHITECTURE.md](ARCHITECTURE.md).

CI runs the test suite and build on every PR; pushes to `main` deploy to
GitHub Pages.
