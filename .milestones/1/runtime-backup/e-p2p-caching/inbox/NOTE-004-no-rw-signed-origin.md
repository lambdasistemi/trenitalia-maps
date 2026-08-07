# Ruling: no real-world upstream; origin signs (pause still holds)
Supersedes NOTE-002/003 upstream framing. ViaggiaTreno is DEAD (legality).
The demo is self-contained: OUR origin emits SIGNED samples; the scarce
resource is the fixed budget at the origin boundary; p2p distributes signed
samples. Your design phase now owns the central question: WHAT is the shared
origin, given no external upstream and per-tab simulators being incompatible
worlds? Candidates to cost honestly: (a) server-side simulator origin on our
own infra — real network boundary, global budget enforceable, real signing
key; (b) deterministic shared-seed sim with an artificial oracle boundary —
serverless but scarcity is emulated; name the honesty tradeoff explicitly.
Q-file the design with recommendation; desk arbitrates.
