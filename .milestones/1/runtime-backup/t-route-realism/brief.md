# Brief — ticket-orchestrator: realistic service routes (trenitalia-maps)

## Identity
- Worker id: `t-route-realism`. Your pane: `%4987`, window `@3404` (currently
  `trenitalia-maps-ms1-t-unknown-route-realism` — rename to
  `trenitalia-maps-ms1-t<issue#>-route-realism` once you file the issue).
- Role: **ticket-orchestrator** (sub-orchestrator). Read and follow
  `/home/paolino/.claude/skills/ticket-orchestrator/SKILL.md`,
  `/home/paolino/.claude/skills/resolve-ticket/SKILL.md`,
  `/home/paolino/.claude/skills/tmux-orchestrator/SKILL.md`. You never write
  production/test code yourself — dispatch a driver+navigator pair.
- CLI/effort (economy profile): you = Codex `high`.
  Pair: driver = `codex-raw --dangerously-bypass-approvals-and-sandbox -c model_reasoning_effort=medium`,
  navigator = `claude --dangerously-skip-permissions --model 'claude-opus-5[1m]'` then `/effort high`.
- Parent: milestone owner `trenitalia-maps` M1, desk window
  `trenitalia-maps-ms1-live-map`, runtime `/tmp/ms-trenitalia-1`. Wrong-scope
  pastes: don't act; surface or Q-file.

## Parent active goal
M1 — public polished live map:
https://github.com/lambdasistemi/trenitalia-maps/milestone/1
Repo `lambdasistemi/trenitalia-maps`; local main tree `/code/trenitalia-v2`
(worktree-guard blocks edits there — use your own worktree).

## Sequencing gate (before any worktree)
PR #1 is being merged by lane `t-focus-poll`. Do NOT create your worktree
until it lands: poll
`gh pr view 1 --repo lambdasistemi/trenitalia-maps --json state --jq .state`
every 60 s until `MERGED`, then branch from fresh `origin/main`.
Meanwhile do the non-repo bootstrap (issue, planner, window rename, spec
drafting from read-only main tree).

## The ticket
Operator's words (Italian, verbatim): *"origine e destinazione sembrano
sbagliate, tratte troppo brevi da stazioni minori"* — origins/destinations
look wrong; routes far too short, running between minor stations.

Diagnosis evidence (from the milestone owner's session — verify yourself):
- `Simulator._randomRoute` random-walks the rail graph starting from ANY
  station `tier ≤ maxTier` (regionale: tier ≤ 2, i.e. OSM halts), and route
  "length" is a STATION COUNT (5–10), not km. Adjacent halts are 1–3 km
  apart, so real observed services include: `R 6489` "Milano Centrale →
  Wagner" (8 km), `R 4667` "Poliambulanza → Sanpolino" (7 km), `R 3325`
  "Cimiano → Lambrate FS" (4 km). These read as tram hops, not services.

Goal: generated services must look like real ones.
Acceptance (observable; refine into the issue):
- Every service's origin AND destination is a meaningful endpoint: tier 0
  for freccia; tier ≤ 1 for intercity; regionale endpoints tier ≤ 1 (halts
  are intermediate stops only, never endpoints).
- Minimum route length per type (config tunables), e.g. regionale ≥ ~30 km,
  intercity ≥ ~80 km, freccia ≥ ~150 km — your spec picks the numbers and
  documents them.
- Intermediate tier-2 halts still appear inside regionale routes.
- Tests prove the generator constraints (endpoint tiers, min km per type)
  over many seeded generations, including a negative control (a generator
  violating the constraint must fail the test).
- In-app spot check: pinned panes show plausible origin → destination pairs.
- ARCHITECTURE/docs updated where they describe the simulator.

Relevant modules (your spec owns the fence): `src/route.js`,
`src/simulator.js`, `src/config.js`, tests. Out of scope: scheduler/budget
(lane t-focus-poll owns those files right now — do not touch), glyph
rendering (lane t-train-glyph), `.github/`.

## Merge order (binding)
Serialized: t-focus-poll → YOU → t-train-glyph. Rebase onto main after the
preceding merge; never merge without my A-file authorization (Q-file when
green + acceptance verified item-by-item).

## Bootstrap (all yours)
1. File the issue (label `feat` or `fix` as you judge, assignee `paolino`,
   milestone M1); add to planner (field IDs:
   `/home/paolino/.claude/projects/-code/memory/project_planner_field_ids.md`).
2. Rename window to `trenitalia-maps-ms1-t<issue#>-route-realism`.
3. After the sequencing gate: worktree `/code/trenitalia-v2-issue-<N>`,
   branch `feat/route-realism`, gate + draft PR per resolve-ticket/worktrees.
4. Spec/plan/tasks; dispatch the pair (quadrant by splitting YOUR pane;
   pair brief points at `/home/paolino/.claude/skills/pair-programming/SKILL.md`).
5. Install the file protocol for your pair under your nested runtime root.

## Protocol (to me)
- Runtime root `/tmp/ms-trenitalia-1/t-route-realism/`; append one line per
  milestone to `STATUS.md`: `<ISO-8601-UTC>  <TAG>  <msg>`; tags START /
  PLANNING / SLICE-START / SLICE-DONE / COMMIT / PUSHED / GATE-PASS /
  GATE-FAIL / BLOCKED / RESUMED / NOTE / COMPLETE. First action: append
  `START pane=%4987`.
- Decisions I should make → `questions/Q-NNN-<slug>.md` + `BLOCKED` line;
  poll `answers/A-NNN-<slug>.md` every 30 s. Check `inbox/` for `NOTE-*.md`
  before each sub-step, after each, and before COMPLETE.
- NO AskUserQuestion for anything I should arbitrate — invisible to me.
- Auto-continue between slices; real pauses only: Q-blocker, gate failure
  after one retry, contract/scope surprise.
- Conventional Commits, bisect-safe, one commit per slice, lint before push,
  PR body current, no AI attribution.

## Stop-and-ask
- Wanting to touch files owned by the other lanes (scheduler/api-client/
  cache/main.js wiring; map-renderer/train-glyph).
- Changing station tier data semantics in `network.json`.
- Anything in `.github/` or Pages.

[DISPATCH-t-route-realism-2026-07-29]
