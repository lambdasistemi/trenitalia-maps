# Q-001 — P2P-SAMPLE-INTEGRITY: threat model + contract proposal

From: `e-p2p-security` (epic owner, pane %4992) · 2026-07-29
Deliverable 1 per my brief. Docs only — no children filed, no code touched.

Full text on disk:
- `/tmp/ms-trenitalia-1/e-p2p-security/design/threat-model.md`
- `/tmp/ms-trenitalia-1/e-p2p-security/design/p2p-sample-integrity-contract.md`

## The proposal in one sentence

**A peer sample is a hint about *what to look at*, never evidence about *what is
true*** — everything a viewer renders as fact was fetched by that viewer, from
upstream, out of its own budget.

## What the threat model found (9 threats, all code-anchored)

The peer channel would inherit the trust level of the upstream fetch path, and
that level is currently *total*: `TrainStore.ingestProgress()` validates no field.
Three findings drive the proposal:

- **T4 (highest severity)** — `t.number` / `t.type` / `t.status` are interpolated
  **unescaped** into `innerHTML` at `src/ui.js:71`, `:139`, `:185`, `src/hud.js:77`.
  Inert today (simulator-only strings); the first peer-supplied train record turns
  it into stored XSS firing in every viewer who hovers, pins, or searches it.
  **This is a present-tense bug, independent of any transport decision.**
- **T3 + T6** — peer-fed station boards create unbounded placeholder trains, and
  placeholders become scheduler poll targets: a peer-channel route to spending real
  upstream requests without ever touching the token bucket. And the *obvious*
  defence (spot-check on arrival) hands the attacker control of our upstream
  request pattern → 429 → `shrink(0.5)` → they degrade the map through our own
  defence. Verification must be pull-scheduled from the existing budget.
- **T2** — the `phaseH` anti-rewind guard (`train-store.js:78`) is adversary-
  controllable: `phaseH = 1e12` pins a chosen train *and* makes every honest
  sample afterwards fail the test. A guard written against accidents, reused
  against adversaries. That shape recurs (also the staleness fade, T5) — flagging
  it for your cross-epic invariant ledger.

## Options, honestly

| | Stops forgery | Survives sybil | Budget cost | Needs server |
|---|---|---|---|---|
| A spot-check | retrospectively | no | zero-sum slice | no |
| B quorum | not vs. sybil | **no** | none | no |
| C upstream-signed | **yes** | n/a | none | **yes** |
| D hint-only | **by construction** | bounded | zero | no |
| E rate/reputation | no | no | low | no |

## My recommendation

1. **Option D (hint-only) now** — peer messages carry only `trainId`/`stationId`/
   `observedAt` and their sole effect is a capped scheduler priority nudge. T1, T2,
   T4, T5 become *unreachable* rather than defended. Costs nothing from
   `REQUEST-BUDGET`, ships on Pages today.
2. **Option C if a proxy is approved anyway.** `ARCHITECTURE.md:164-168` already
   says the real API needs a CORS proxy to work in a browser at all. **If that proxy
   is being deployed regardless, signing at it is nearly free and dominates every
   other option** — and it is the only option that lets the caching epic deliver its
   full value. This is the highest-leverage thing for you to decide.
3. B never as a truth gate. A only as hardening on top of C.
4. Enforcing mechanism: a single `peer-gate.js` choke point (the pattern
   `rate-limiter.js` already proves in this repo), an adversarial fixture corpus
   with each test demonstrated able to fail, and a budget-conservation property
   test binding the new channel to `REQUEST-BUDGET`.

## Decisions I need from you

- **Q-A** — Option **D** or **C**?
- **Q-B** — Is a signing proxy on the table (`PAGES-STATIC` waiver)? See §2 above.
- **Q-C** — Privacy (T8): may viewers reveal viewport-derived attention to
  strangers at all, or must it be coarsened? This constrains the wire format.
- **Q-D** — Cross-epic: **Option D materially reduces what the caching epic can
  deliver** (allocation improves; displaying never-fetched data does not). That
  trade is yours to arbitrate with their wire format — I have not contacted them.
- **Q-E** — T4 (DOM escaping) is a live bug now, not a p2p bug. Do you want it
  filed as an early child ahead of the implementation gate, or held? I have **not**
  filed it.

## State

Parked per `inbox/NOTE-001-operator-pause.md`. Nothing dispatched, nothing
half-written in a pane. Standing by for an A-file.
