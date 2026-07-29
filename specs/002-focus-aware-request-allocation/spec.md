# Feature specification: focus-aware request allocation

Issue: [#2](https://github.com/lambdasistemi/trenitalia-maps/issues/2)

## Priority user story

As a person inspecting one train, I want the pinned train to receive a fresh
progress sample about every ten seconds so its details remain useful, without
increasing the application's total request rate.

## Observable scenarios

### Pin by map click

Given a live train is visible, when it is clicked and pinned, then that train
becomes the scheduler's focused target and receives fresh progress samples at
the configured focus cadence.

### Pin by search

Given a train appears in search results, when that result is selected, then the
same focus behavior applies as for a map click.

### Unpin

Given a train is focused, when the pane is closed, Escape is pressed, an empty
map area is clicked, or the train expires, then focus is cleared immediately
and ordinary viewport-and-staleness scheduling resumes with no residual state.

## Functional requirements

- FR-001: `CONFIG` defines `FOCUS_POLL_INTERVAL_MS`, defaulting to 10,000 ms.
- FR-002: the scheduler exposes one operation that sets a train id as focused
  and clears focus when given no id.
- FR-003: a newly focused registered train is immediately eligible for a
  focused refresh; while focus remains active it is promoted again whenever
  the focus interval elapses.
- FR-004: a due focused target is considered before ordinary priority-scored
  targets, but still consumes a slot only through the existing
  `rateLimiter.tryConsume()` gate and remains inside the existing per-tick cap.
- FR-005: every admitted focused slot displaces an ordinary slot. Focus must
  not change the limiter rate, burst semantics, tick cadence, or per-tick cap.
- FR-006: a focused train-progress call obtains fresh source data even when a
  normal train-progress cache entry is younger than
  `CACHE_TTL_TRAIN_PROGRESS_MS`.
- FR-007: focused refresh preserves in-flight request coalescing and updates
  the same cache entry used by normal polling. Subsequent normal polls retain
  ordinary TTL-cache behavior.
- FR-008: map-click pinning and search-result pinning use the same focus wiring.
- FR-009: every unpin path clears both visual selection and scheduler focus.
- FR-010: `ARCHITECTURE.md` is the normative record for focus allocation and
  explicitly states that it reallocates the `REQUEST-BUDGET` contract rather
  than inflating it.

## Success criteria

- SC-001: under sustained normal operation, the pinned pane's data age remains
  at or below approximately 12 seconds after focus has taken effect.
- SC-002: deterministic tests show a focused target is selected immediately
  and again at the configured cadence, but not before it is due.
- SC-003: deterministic tests show focused and unfocused schedules admit the
  same total number of limiter-approved slots; the focused target gains exactly
  the slots ordinary targets lose.
- SC-004: deterministic tests show clearing focus removes all focus preference.
- SC-005: an API/cache test seeds a fresh normal cache entry, performs a
  focused refresh before the 15-second TTL expires, observes a second source
  request and fresh result, then observes that normal polling still reuses the
  refreshed cache entry.
- SC-006: the complete test suite and production build pass.

## Invariants and negative controls

- The budget-conservation proof must use a limiter spy whose admitted count is
  compared between focused and control schedules. A test that only inspects
  scheduler ordering is insufficient.
- The cache proof must first demonstrate the control case: a second ordinary
  call inside the TTL does not reach the source. It must then demonstrate that
  the focused call does reach the source. This proves the instrument can fail
  in both directions.
- The unpin proof must advance through another focus interval after clearing
  focus; merely checking a stored id is insufficient.

## Out of scope

- Any change to stale/grey rendering thresholds or presentation semantics.
- Any increase or reinterpretation of the fixed global request budget.
- GitHub Actions, deployment, or Pages configuration.
- A redesigned pinned-pane status display.
