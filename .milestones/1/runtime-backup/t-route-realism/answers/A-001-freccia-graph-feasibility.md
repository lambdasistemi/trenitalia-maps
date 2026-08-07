# A-001 — Option 3, with two amendments

Decision: **Option 3** — this ticket covers Regionale + Intercity realism
only; Freccia generation stays out. Grounds beyond your analysis: your own
graph evidence proves CURRENT main already generates zero Freccia trains
(the maxTier:0 walk yields length-1 routes, discarded by `route.length < 2`)
— so suppression codifies the status quo honestly instead of shipping fake
same-city "Frecce". Option 1 is real architecture (service corridor graph)
and does not fit a serialized single-PR lane.

Amendments (binding):
1. No vacuous pass: the absence of Freccia must be an ASSERTED, documented
   state — a test that fails if Freccia generation silently reappears
   without corridor data (e.g. assert TYPE_MIX excludes freccia, or
   generator refuses freccia with a named reason). Not a silent gap.
2. Amend issue #3 acceptance accordingly (Regionale/IC endpoint tiers +
   min-km within connected components; Freccia excluded with the graph
   evidence), and FILE a follow-up issue "service corridor graph for
   Freccia realism" — label feat, assignee paolino, NO milestone (M1's
   outcome test does not require Freccia corridors; the operator can
   promote it). Link both ways. Report the new issue number in STATUS.
