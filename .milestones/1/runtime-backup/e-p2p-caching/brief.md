# Brief — epic-orchestrator: p2p caching (trenitalia-maps)

## Identity
- Worker id: `e-p2p-caching`. Your pane: `%4991`, window `@3408` (currently
  `trenitalia-maps-ms1-e-unknown-p2p-caching`; rename to
  `trenitalia-maps-e<epic#>-t<child#>-<goal>` as children activate).
- Role: **epic-orchestrator**. Load the `epic-orchestrator` skill first; it
  pulls tmux-orchestrator etc. You NEVER write code; children (ticket lanes)
  do, via driver+navigator pairs.
- Effort profile (economy): you = Opus xhigh (already set via /effort in your
  pane). Children: ticket-orchestrator Codex high, driver Codex medium,
  navigator Opus high.
- Parent: milestone owner `trenitalia-maps` M1, desk window
  `trenitalia-maps-ms1-live-map`, runtime `/tmp/ms-trenitalia-1`. Wrong-scope
  pastes: don't act; Q-file.

## Milestone context
M1 — public polished live map:
https://github.com/lambdasistemi/trenitalia-maps/milestone/1
Repo `lambdasistemi/trenitalia-maps`. Live site (GitHub Pages, static):
https://lambdasistemi.github.io/trenitalia-maps/
Main tree `/code/trenitalia-v2` (read-only for you; children use worktrees).

## The epic
Operator's words: *"epic: p2p caching"*.

Outcome to design toward: **N concurrent viewers of the live site share
fetched samples peer-to-peer, so total upstream API load stays ~ONE global
request budget (not N× per-client budgets), while every viewer's data
freshness is at least the single-client baseline.**

DESIGN-FIRST. No implementation children until the design is approved:
1. Survey the codebase seams (rate-limiter, cache, api-client, scheduler).
2. Produce a design doc (architecture, transport options, protocol, failure
   modes). Explore the transport space honestly: BroadcastChannel (same
   device), WebRTC data channels (needs signaling — see constraint below),
   and anything else defensible. State trade-offs.
3. Q-file the design summary to me for approval BEFORE filing children.
4. Then: file the parent epic issue + ordered child issues (label feat,
   milestone M1, assignee paolino, planner board — field IDs in
   /home/paolino/.claude/projects/-code/memory/project_planner_field_ids.md),
   rename your window, and run children per your role skill.

## Binding contracts (registry excerpts)
- REQUEST-BUDGET: the per-client rate-limiter gate stays the SOLE upstream
  choke point; the p2p layer must never add uncontrolled upstream fetches.
  Peer-received samples are cache fills, not budget events.
- PAGES-STATIC: the site is a static GitHub Pages deploy. ANY server-side
  component (signaling, TURN, relay) is an OPERATOR decision — Q-file to me
  with options + recommendation before assuming infra exists.
- P2P-SAMPLE-INTEGRITY (cross-epic, enforced: NONE today): a sibling epic
  `e-p2p-security` owns the threat model and trust mechanism for
  peer-shared samples. Do NOT finalize the gossip/sample wire format
  without that contract — Q-file to me at that design point; I arbitrate
  between the two epics. Never coordinate with the sibling directly.

## Sequencing fences (binding)
- Implementation children touching `src/cache.js`, `src/api-client.js`,
  `src/scheduler.js`, `src/main.js` wait until ticket lane t-focus-poll
  (issue #2, PR https://github.com/lambdasistemi/trenitalia-maps/pull/5)
  merges. Design/spec/docs work has no fence — proceed now.
- Merges are serialized milestone-wide and authorized by me via A-file;
  your lanes request via Q-file when green + acceptance verified.

## Protocol (to me)
- Runtime root `/tmp/ms-trenitalia-1/e-p2p-caching/`; append one line per
  milestone to `STATUS.md`: `<ISO-8601-UTC>  <TAG>  <msg>`; tags START /
  PLANNING / MAP / TICKET-DISPATCHED t<NNN> / TICKET-COMPLETE t<NNN> /
  COMMIT / PUSHED / GATE-PASS / GATE-FAIL / BLOCKED / RESUMED / NOTE /
  COMPLETE. First action: append `START pane=%4991`.
- Decisions I should make → `questions/Q-NNN-<slug>.md` + `BLOCKED` line;
  poll `answers/` every 30 s. Check `inbox/` for NOTE-*.md between steps.
- NO AskUserQuestion for anything I should arbitrate.
- Maintain your replication fragment (`.orch/window-brief.md`) once you have
  a worktree context, per tmux-orchestrator.
- Conventional Commits, bisect-safe, no AI attribution, PR bodies current.

## Stop-and-ask (Q-file)
- Design approval (mandatory, before children).
- Any server-side/infra component.
- Wire-format decisions touching P2P-SAMPLE-INTEGRITY.
- Any touch of files fenced to t-focus-poll before its merge.

[DISPATCH-e-p2p-caching-2026-07-29]
