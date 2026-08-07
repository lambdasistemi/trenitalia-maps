# M1 — Public polished live map (trenitalia-maps)

**STATE: OMNIA PAUSA 2026-08-07T15:28Z on top of the standing operator milestone pause (07-29)** — desk and all 5 lanes PARKED; resume = machine RELEASE + operator three words (resume, glyph pick Q-002 rec B, upstream ruling rec B); then inbox-wake lanes (rulings NOTE-002..006 queued) and re-arm watchdog. Note for resume: seat contract changed 08-05 (Claude T.O. -> Codex commit owner -> Claude auditor; pair-programming deprecated) — lane briefs referencing driver+navigator pairs need updating at wake.
— whole session parked, all wake sources quiesced, desk wakes only on operator
input. Release: RELEASE-2026-07-31.md in /tmp/machine/pausa/. On release,
re-arm per rearm_on_release in the pausa ack; lanes resume via inbox notes.
released; provider hold active until RELEASE-CLAUDE-HOLD. Codex ticket lanes
(t-focus-poll, t-route-realism, t-train-glyph) RESUMED with navigator panes
held (slices park at the review handshake, no CLI substitution). Opus epic
lanes (e-p2p-caching, e-p2p-security) remain PARKED; their rulings queue in
inboxes. No new Claude panes. Desk alive (low-burn).
t-train-glyph, t-route-realism confirmed; epics pending inbox poll). RULING
2026-07-29T17:24Z: PRODUCT — real ViaggiaTreno data ("full current train
information from trenitalia"). On resume: found the real-data epic FIRST
(ViaggiaTreno client + CORS-proxy infra decision), epic order real-data ->
p2p-caching -> p2p-security; ruling notes already in both epic inboxes.
park at durable points (inbox NOTE-001-operator-pause in each lane root).
Resume: answer the parked decisions below, then send each lane an inbox
resume note (or A-file). No merges, no new dispatches while paused.

## Outcome test
THESIS: capitalize on a scarce vital resource by distributing knowledge — self-contained: an ORACLE origin commits Merkle roots of the world state to a cheap anchor; p2p distributes ever-changing partial data with inclusion proofs; verification = proof vs root (non-equivocation: one world for all peers). Anchoring venue open (MPFS dogfood is default candidate; null-chain signed-root is the control). Real-world upstream: research landed (research/trenit-case.md) — per-query re-display is precedent-safe (Trenit 2019 + CV-Online 2021); full-state mirroring is not; operator re-ruling PENDING between sim-only (A) and demand-driven real data (B, desk-recommended); rename away from "trenitalia" advised in all scenarios. Blockchain reputation dropped.
by distributing knowledge (p2p sample sharing). Outcome test: N viewers, real
ViaggiaTreno trains, ~ONE budget of total upstream load regardless of N,
per-viewer freshness ~ single-client, principle observable on screen. Plus:
trains move along real tracks with headings matching motion; journey panes
describe the leg actually driven; UX has status HUD / selection / search /
controls; request budget bounded and focus-aware (pinned train ~1 req/10s).
GitHub milestone: https://github.com/lambdasistemi/trenitalia-maps/milestone/1

## State (2026-07-29T17:22Z)
| lane | issue | PR | pane | stage |
|---|---|---|---|---|
| t-focus-poll | #2 | #5 | %4984 | slice: architecture (pair active) |
| t-route-realism | #3 | #6 | %4987 | resumed: Regionale+IC only per A-001 |
| t-train-glyph | #4 | #7 | %4988 | resumed: isolated playwright per A-001 |
| e-p2p-caching | pending | — | %4991 | design phase (gated: no children until design approved) |
| e-p2p-security | pending | — | %4992 | threat-model phase (gated: no implementation until caching transport fixed) |

Merged: PR #1 (UI/UX + CI + Pages), externally by operator 2026-07-29T16:50Z; site live.

## Priority
Tickets: focus-poll -> route-realism -> train-glyph, merges serialized.
Epics: design-doc phases only; BOTH gated on the operator's product-vs-showcase
answer (desk grill 2026-07-29T17:20Z): "product" -> caching epic gains a
shared-world decision (real ViaggiaTreno proxy vs shared-seed sim) as first
design item; "showcase" -> both epics stop at design docs, no children.

## Decisions on record
- A-001 route-realism: Freccia excluded from #3 (graph evidence: zero tier0-
  tier0 edges; current main already generates zero Frecce). Absence must be
  ASSERTED by a test; follow-up corridor issue to be filed (no milestone).
- A-001 train-glyph: lane runs isolated Playwright; desk released the shared
  profile it was holding.

## Queue (not yet dispatched)
- persistenza query/view — after t-focus-poll merges (fence overlap main.js/ui.js).
- Freccia corridor graph — filed as https://github.com/lambdasistemi/trenitalia-maps/issues/8 (no milestone; operator may promote).
- campi di ricerca/selezione — AMBIGUOUS, awaiting operator ("filtri"/"campi"/"UI").

## Parked decisions (operator)
- product-vs-showcase (gates both p2p epics) — asked 17:20Z.
- staleness display semantics (700 trains / 5 req/s vs 60s threshold).

## Escalations in flight
none
