# Tasks: realistic simulated service routes

## Slice 1 — constrained service generation

- [ ] T001 Add a seeded property oracle for endpoint tiers, edge-summed
  distance, and simple paths on the real graph.
- [ ] T002 Prove the oracle is live with a deliberately constraint-violating
  generator that it must reject.
- [ ] T003 Add tested configuration contracts for Regionale and Intercity and
  an asserted Freccia exclusion.
- [ ] T004 Implement bounded, distance-aware route generation with meaningful
  endpoints and explicit failure.
- [ ] T005 Integrate constrained routes into the simulator with deterministic
  random and train-count injection for tests.
- [ ] T006 Prove tier-2 halts remain represented inside seeded Regionale
  routes.
- [ ] T007 Update `ARCHITECTURE.md` with the delivered simulator policy and
  issue #8 boundary.
- [ ] T008 Run the full gate and record pinned Regionale and Intercity journey
  evidence.

Commit subject:

```text
fix: generate realistic regional service routes
```

Commit trailer:

```text
Tasks: T001, T002, T003, T004, T005, T006, T007, T008
```
