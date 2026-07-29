# Implementation plan: focus-aware request allocation

## Technical context

The browser app is plain JavaScript with Node's built-in test runner. The
existing `Scheduler` owns target selection, `RateLimiter.tryConsume()` owns the
fixed global admission ceiling, and `ApiClient` plus `Cache` own TTL reuse and
in-flight coalescing.

The current failure seam is between scheduling and caching: the scheduler marks
a train polled and spends an admitted slot before `ApiClient.trainProgress()`
returns a still-valid 15-second cache entry. A ten-second focus cadence would
therefore be observable in scheduler metrics but not in train freshness.

## Design

1. Record the contract in `ARCHITECTURE.md` before implementation. A due
   focused train is promoted ahead of the ordinary score ordering, but passes
   through the unchanged limiter and tick cap. One focused slot therefore
   replaces one ordinary slot.
2. Add `FOCUS_POLL_INTERVAL_MS` and scheduler focus state. Focus selection is
   immediate on a changed train id, repeats only when due, and is fully cleared
   on unpin. Inject or parameterize time only as much as deterministic tests
   require.
3. Extend train-progress fetching with an explicit focused-fresh option. It
   bypasses only the TTL read, keeps in-flight coalescing, writes the normal
   cache entry, and leaves all ordinary calls unchanged.
4. Route both click and search pinning through the same focus operation in
   `main.js`; route every existing unpin path through one focus-clear callback.
5. Prove cadence, conservation, unpin reset, and cache freshness with
   deterministic Node tests, then run the full gate and a browser smoke.

## Slice boundaries

### Slice A — normative architecture record

Owned file: `ARCHITECTURE.md`.

Land the focus-reallocation contract before code. This is a docs-only,
bisect-safe commit. The navigator verifies the prose matches `REQUEST-BUDGET`,
names the cache seam, and does not alter staleness display semantics.

### Slice B — vertical focus allocation

Owned files:

- `src/config.js`
- `src/scheduler.js`
- `src/api-client.js`
- `src/main.js`
- `test/focus-poll.test.js`

Add the tunable, focus scheduling, focused-only cache freshness, unified UI
wiring, and all required proofs in one behavior-complete commit. No cache module
change is planned because skipping the cache read belongs in `ApiClient`; the
existing `Cache.coalesce()` and `Cache.set()` behavior remains the correct seam.

## Verification

- Focused RED/GREEN: `node --test test/focus-poll.test.js`
- Full gate: `./gate.sh`
- Browser smoke: run the built/dev app, pin by search and by map click, observe
  scheduler focus state and data-age refresh, then unpin and observe focus clear.
- Final GitHub Actions CI on the pushed draft PR.

## Explicitly forbidden

- Changes to `src/rate-limiter.js` or request-budget semantics.
- Changes to staleness thresholds, grey rendering, or pane age coloring.
- Changes under `.github/workflows/` or Pages configuration.
- Raising `REQUEST_BUDGET_PER_SEC`, `SCHEDULER_TICK_MS`, or the per-tick cap.
