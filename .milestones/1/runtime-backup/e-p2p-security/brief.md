# Brief — epic-orchestrator: p2p security (trenitalia-maps)

## Identity
- Worker id: `e-p2p-security`. Your pane: `%4992`, window `@3409` (currently
  `trenitalia-maps-ms1-e-unknown-p2p-security`; rename as children activate).
- Role: **epic-orchestrator**. Load the `epic-orchestrator` skill first. You
  NEVER write code; children do, via driver+navigator pairs.
- Effort profile (economy): you = Opus xhigh (set via /effort in your pane).
  Children: ticket-orchestrator Codex high, driver Codex medium, navigator
  Opus high.
- Parent: milestone owner `trenitalia-maps` M1, desk window
  `trenitalia-maps-ms1-live-map`, runtime `/tmp/ms-trenitalia-1`. Wrong-scope
  pastes: don't act; Q-file.

## Milestone context
M1 — public polished live map:
https://github.com/lambdasistemi/trenitalia-maps/milestone/1
Repo `lambdasistemi/trenitalia-maps`. Live site (static GitHub Pages):
https://lambdasistemi.github.io/trenitalia-maps/
Sibling epic `e-p2p-caching` is designing the p2p sample-sharing layer.

## The epic
Operator's words: *"epic: p2p security"*.

Outcome: **the p2p layer cannot be used by a malicious or buggy peer to
poison, forge, or degrade other viewers' maps, and abuse is bounded** —
defensive security for our own application's peer channel.

THREAT-MODEL-FIRST. Deliverable 1 (before any children):
1. A threat model for peer-shared samples: data poisoning (fake positions/
   delays), impersonation, replay/staleness attacks, gossip flooding/DoS,
   privacy of viewers.
2. A concrete proposal for the P2P-SAMPLE-INTEGRITY contract: what a peer
   may trust from another peer and HOW it is verified. Honest options
   analysis (e.g. spot-check received samples against the client's own
   budgeted fetches; quorum/agreement across peers; upstream-signed data —
   note that requires a backend, which is an operator decision; rate/
   reputation limits). State residual risks for each.
3. Q-file that proposal to me. I arbitrate it WITH the caching epic's wire
   format — you never coordinate with the sibling directly.
4. Only after the contract is fixed: file parent epic issue + ordered child
   issues (label feat, milestone M1, assignee paolino, planner board — field
   IDs in /home/paolino/.claude/projects/-code/memory/project_planner_field_ids.md),
   rename your window, run children per your role skill.

## Binding contracts (registry excerpts)
- P2P-SAMPLE-INTEGRITY: enforced: NONE today. Your epic exists to give it an
  enforcing mechanism + tests. Every child must strengthen it, never bypass.
- REQUEST-BUDGET: verification mechanisms that spend upstream requests
  (spot-checks) draw from the SAME fixed budget — allocation, not inflation.
- PAGES-STATIC: no server-side component without operator approval (Q-file).

## Sequencing fences (binding)
- Design/threat-model work: proceed now, docs only.
- Implementation children: NOT until (a) the caching epic's transport design
  is approved and (b) I open your implementation gate — the trust mechanism
  must target the real transport, not a guess.
- Merges serialized milestone-wide; authorization via my A-file only.

## Protocol (to me)
- Runtime root `/tmp/ms-trenitalia-1/e-p2p-security/`; append one line per
  milestone to `STATUS.md`: `<ISO-8601-UTC>  <TAG>  <msg>`; tags START /
  PLANNING / MAP / TICKET-DISPATCHED t<NNN> / TICKET-COMPLETE t<NNN> /
  COMMIT / PUSHED / GATE-PASS / GATE-FAIL / BLOCKED / RESUMED / NOTE /
  COMPLETE. First action: append `START pane=%4992`.
- Decisions I should make → `questions/Q-NNN-<slug>.md` + `BLOCKED` line;
  poll `answers/` every 30 s. Check `inbox/` between steps.
- NO AskUserQuestion for anything I should arbitrate.
- Conventional Commits, bisect-safe, no AI attribution, PR bodies current.

## Stop-and-ask (Q-file)
- The threat-model/contract proposal (mandatory).
- Any server-side/infra component.
- Anything requiring the sibling epic to change its design.
- Any code-touching work before I open your implementation gate.

[DISPATCH-e-p2p-security-2026-07-29]
