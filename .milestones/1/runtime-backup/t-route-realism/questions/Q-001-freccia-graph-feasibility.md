# How should Freccia realism handle the fragmented rail graph?

## Context

The brief requires every Freccia origin and destination to be tier 0 and every
Freccia route to cover at least 150 km, without changing station tier semantics
in `src/network.json`.

I verified the premise against fresh `origin/main` after PR #1:

- The graph has 83 tier-0 stations and zero edges whose two endpoints are both
  tier 0, so the current `maxTier: 0` walk can never publish a Freccia train.
- Even when all tier-1 and tier-2 nodes are permitted as physical intermediate
  nodes, the fragmented graph connects only four distinct tier-0 pairs:
  Torino P.N.–Torino Porta Susa (2.9 km shortest path), Milano
  Centrale–Milano P. Garibaldi (0.8 km), Reggio Emilia–Modena (43.3 km), and
  Roma Termini–Roma Tiburtina (3.4 km).
- Only 8 of 83 tier-0 stations share a connected component with another
  tier-0 station. Deliberate detours might make one of those paths numerically
  long, but the displayed endpoints would still be implausible same-city or
  short regional pairs and would defeat the ticket goal.

Therefore the three requirements—real graph, tier-0 Freccia endpoints, and
150 km minimum—cannot all hold on the current data.

## Options

1. Expand this ticket to introduce a service-level corridor graph between
   major hubs, separate from the OSM station-edge graph used for rendering.
   This preserves tier-0 endpoints and 150 km journeys but is a meaningful
   architecture/scope expansion and needs an explicit geometry policy for
   disconnected corridors.
2. Relax Freccia endpoints to selected tier-1 stations in sufficiently long
   connected components. This stays within the existing graph but violates
   the brief’s tier-0 endpoint rule and still gives weak national coverage.
3. Keep this ticket limited to Regionale and Intercity, suppress Freccia
   generation, and file a follow-up data/corridor ticket. This avoids invalid
   Freccia services but does not satisfy the stated M1 acceptance in this
   ticket.
4. Authorize a different constraint/data strategy.

## Recommendation

Choose option 1 if Freccia realism is required for M1. Model a service corridor
as a route between major hubs while retaining the existing OSM graph only for
on-map geometry, with the exact corridor/geometry source commissioned by the
parent. If that expansion is too large for this serialized lane, choose option
3 and amend this ticket explicitly rather than accepting a vacuous no-Freccia
pass.
