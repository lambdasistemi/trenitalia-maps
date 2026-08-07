# Direction: integrity = inclusion proofs vs anchored roots (pause holds)
Supersedes NOTE-004's mechanism. P2P-SAMPLE-INTEGRITY becomes: sample valid
iff carrying an inclusion proof against a committed world-state root.
Your threat model, re-centered:
1. ROOT RECENCY: a proof against an old root is valid-but-stale; how does a
   peer know the LATEST root without spending the scarce resource? (root
   gossip, chain query budget, origin push — analyze).
2. ORIGIN EQUIVOCATION: the anchored root kills it — state that as the
   mechanism's core win and verify the anchoring venue actually provides it.
3. Flood/abuse bounds and key/root-of-trust distribution remain.
Per-sample signatures remain the baseline control your design must beat.
