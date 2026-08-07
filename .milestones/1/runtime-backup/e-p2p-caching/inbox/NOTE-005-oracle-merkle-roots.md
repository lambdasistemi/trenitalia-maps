# Direction: oracle + anchored roots (supersedes NOTE-004's open question; pause holds)
Operator: set up an ORACLE where it is really cheap to push Merkle roots;
p2p then distributes ever-changing PARTIAL data WITH PROOFS.
Your shared-origin question is resolved in shape: the origin is an oracle
service holding the world state in a Merkle structure and committing its
root periodically. Design items now yours:
1. ANCHORING VENUE, costed honestly ("really cheap" is the operator's
   criterion): Cardano L1 batched roots; a Hydra head; the operator's OWN
   production MPFS (Merkle Patricia Forestry service, umpfs.plutimus.com —
   built for exactly this: ever-changing KV state with roots on Cardano;
   dogfooding it is the default candidate per the use-existing-libs rule);
   and the NULL-CHAIN baseline (origin-signed root gossiped p2p, no chain)
   as the control every venue must beat on a named benefit.
2. ROOT CADENCE vs FRESHNESS: positions change continuously; the cadence of
   root commitment bounds provable freshness. Name the tension and the
   chosen cadence explicitly.
3. DELTA + PROOF DISTRIBUTION: peers share per-train samples with inclusion
   proofs against the latest root; design the update flow (root rotation,
   proof invalidation, partial sync).
Key argument to carry in the design doc: anchored roots give
NON-EQUIVOCATION (one world for all peers) — the property plain signatures
cannot give. That is the thesis's strongest form.
