# Feature specification: realistic simulated service routes

Issue: [#3](https://github.com/lambdasistemi/trenitalia-maps/issues/3)

## User story

As a map visitor, I want a pinned train to show a recognizable origin and
destination separated by a credible journey distance, so the simulation reads
as a railway service rather than a tram-like hop between arbitrary local
halts.

## Scope decision

This ticket covers Regionale and Intercity services on the bundled graph.
Freccia generation remains explicitly disabled. The current graph cannot
connect distinct tier-0 hubs into credible 150 km services; service-corridor
architecture is tracked in
[#8](https://github.com/lambdasistemi/trenitalia-maps/issues/8).

The exclusion is a tested state, not a missing assertion: generated timetables
must contain no Freccia service, and the service mix must not silently
reintroduce that type.

## Functional requirements

### FR-1: meaningful endpoints

- Regionale and Intercity routes start and end at tier-0 or tier-1 stations.
- Tier-2 halts are never endpoints.
- Regionale traversal may include tier-2 halts as intermediate path nodes.
- Intercity traversal remains limited to tier-0 and tier-1 stations.

### FR-2: distance-based service contracts

Minimum route distance is the sum of the selected `EDGES[*].km` values:

| Service | Minimum | Maximum station nodes | Traversal tier | Endpoint tier |
|---|---:|---:|---:|---:|
| Regionale | 30 km | 48 | 0–2 | 0–1 |
| Intercity | 80 km | 72 | 0–1 | 0–1 |

These values live in `CONFIG`, alongside a bounded route-attempt limit of 256.
Stop counts are safety ceilings, not substitutes for distance.

### FR-3: bounded constrained generation

`src/route.js` exposes a pure constrained generator accepting adjacency,
eligible starts, edge distances, tier lookup, a random source, the service
contract, and the attempt ceiling. It:

1. chooses an eligible endpoint as the start;
2. performs a non-repeating walk through traversal-eligible stations;
3. returns at the first later endpoint that satisfies the minimum distance;
4. retries from a fresh start when a walk dead-ends or reaches its station
   ceiling; and
5. returns an explicit failure after 256 attempts.

A successful result contains the station path, matching edge indexes, and
total kilometres. A failed or partial result is never published as a train.

### FR-4: simulator integration

- The simulator service mix is 80% Regionale and 20% Intercity, preserving the
  current effective mix after the non-producing 10% Freccia entry is removed.
- The simulator passes each selected service contract to the constrained route
  generator.
- Randomness and requested train count are injectable for deterministic tests,
  while browser callers retain the current defaults.
- Segment geometry remains derived from the selected real graph edges.
- A generated timetable never contains a route that violates its service
  contract.

### FR-5: non-vacuous proof

The test suite must:

- run many fixed seeds over the real graph for both supported service types;
- recompute distance from edge indexes and verify it meets the configured
  minimum;
- verify both endpoint tiers and route simplicity;
- demonstrate that sampled Regionale routes still contain tier-2 intermediate
  nodes;
- verify generated simulator timetables contain no Freccia services; and
- run the same property oracle against a deliberately invalid generator and
  require the oracle to reject it.

The negative control is mandatory evidence that the property check can fail.

### FR-6: documentation and observable smoke

`ARCHITECTURE.md` documents the endpoint rules, distance thresholds, bounded
failure, service mix, and explicit Freccia exclusion. A local in-app smoke
pins representative Regionale and Intercity trains and records plausible
origin → destination pairs.

## Out of scope

- Scheduler, rate limiter, API client, cache, or `src/main.js` wiring
- Train glyph or map rendering
- Station tier data or semantics in `src/network.json`
- `.github/` and Pages configuration
- Freccia corridor architecture, tracked by issue #8

## Success criteria

1. Every published Regionale and Intercity route satisfies its endpoint and
   kilometre contract.
2. Seeded real-graph sampling includes tier-2 intermediate regional halts.
3. The deliberately violating generator is rejected by the property oracle.
4. Freccia absence is asserted and documented.
5. The full test suite and production build pass.
6. Pinned in-app journeys show credible endpoint pairs for both supported
   service types.
