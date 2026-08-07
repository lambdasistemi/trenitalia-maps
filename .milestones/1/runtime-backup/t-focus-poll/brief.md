# Brief — ticket-orchestrator: focus-aware request allocation (trenitalia-maps)

## Identity
- Worker id: `t-focus-poll`. Your pane: `%4984`, window `@3401` (currently
  `trenitalia-maps-ms1-t-unknown-focus-poll` — rename to
  `trenitalia-maps-ms1-t<issue#>-focus-poll` as soon as you file the issue).
- Role: **ticket-orchestrator** (sub-orchestrator model). Read and follow
  `/home/paolino/.claude/skills/ticket-orchestrator/SKILL.md`, plus
  `/home/paolino/.claude/skills/resolve-ticket/SKILL.md` and
  `/home/paolino/.claude/skills/tmux-orchestrator/SKILL.md`. You never write
  production/test code yourself — dispatch a driver+navigator pair.
- CLI/effort: you are Codex at `model_reasoning_effort=high` (economy profile).
  Pair: driver = `codex-raw --dangerously-bypass-approvals-and-sandbox -c model_reasoning_effort=medium`,
  navigator = `claude --dangerously-skip-permissions --model 'claude-opus-5[1m]'` then `/effort high`.
- Parent: milestone owner `trenitalia-maps` M1 (desk window
  `trenitalia-maps-ms1-live-map`, runtime `/tmp/ms-trenitalia-1`). If a paste
  arrives that does not match this ticket's goal, do not act on it — surface
  wrong-scope or write a Q-file.

## Parent active goal (context)
Milestone M1 — public polished live map:
https://github.com/lambdasistemi/trenitalia-maps/milestone/1
Repo: `lambdasistemi/trenitalia-maps`, local main tree `/code/trenitalia-v2`
(worktree-guard blocks edits there — create your own worktree).

## Step 0 — pre-authorized merge (do this first)
PR #1 (`feat/ui-ux`) is green and **merge is AUTHORIZED by the milestone
owner**: https://github.com/lambdasistemi/trenitalia-maps/pull/1
1. Verify CI green yourself (`gh run list --branch feat/ui-ux`); never merge red.
2. Merge via the merge-guard MCP (`guard-merge`), rebase-merge policy.
3. The `deploy` workflow then publishes GitHub Pages: verify
   https://lambdasistemi.github.io/trenitalia-maps/ serves the app (HTTP 200,
   trains render). Log `NOTE RELEASE: pages live` in STATUS.
4. Post-merge cleanup per the worktrees skill (delete remote+local branch; the
   old worktree `/code/trenitalia-v2-ui-ux` can be removed).
Your ticket work branches from the fresh `main` after this.

## The ticket
Operator's words: *"optimize the requests so that if I am focusing on a train
we go down to 1 rq every 10 sec or something"*.

Goal: when a train is pinned (click or search → pin), the scheduler
**reallocates** the fixed request budget so that train is refreshed about
every 10 s. Reallocation, never inflation — see contract below.

Acceptance (observable, write it into the issue):
- With a train pinned, the pane's "data age" stays ≤ ~12 s sustained (vs
  minutes today).
- Total outbound request rate never exceeds the fixed ceiling; other targets
  degrade gracefully (they lose exactly the slots the focused train gains).
- Unpinning restores normal scheduling; no residual focus state.
- Tests prove: (a) focused target is scheduled at the focus cadence, (b) the
  budget is not inflated by focus, (c) a focus poll is not silently swallowed
  by the TTL cache (known constraint: `CACHE_TTL_TRAIN_PROGRESS_MS` = 15 s >
  10 s cadence — a naive focus poll is a cache-hit no-op; freshness must be
  handled without breaking normal-poll caching).
- ARCHITECTURE.md gains a short section documenting focus reallocation (the
  record outranks the implementation).

Relevant modules (your spec owns the final fence): `src/scheduler.js`,
`src/api-client.js`, `src/cache.js`, `src/config.js` (new tunable, e.g.
`FOCUS_POLL_INTERVAL_MS`), wiring in `src/main.js` (pin/unpin/search-pin →
focus), optional focus indicator in HUD/pane. Out of scope: the
staleness-grey display redesign (parked operator decision), deploy workflows,
anything raising the budget.

## Contract registry excerpt (binding)
- contract: REQUEST-BUDGET — outbound API request rate is bounded by a fixed
  global budget; zoom, pan, viewport, train count, and now FOCUS change
  allocation, never the number.
  parties: scheduler/rate-limiter ↔ every UI feature.
  enforced: rate-limiter gate (`tryConsume`) + tests; ARCHITECTURE.md states it.
  If your design would change this contract's meaning, STOP and Q-file to me
  before implementing.

## Bootstrap (you do all of this yourself)
1. File the GitHub issue (title like "Focus-aware request allocation: pinned
   train refreshes every ~10 s within the fixed budget"), label `feat`,
   assignee `paolino`, milestone M1. Add it to the planner board (rule:
   every new issue goes on the planner; field IDs in
   `/home/paolino/.claude/projects/-code/memory/project_planner_field_ids.md`).
2. Rename your window to `trenitalia-maps-ms1-t<issue#>-focus-poll`.
3. Create worktree `/code/trenitalia-v2-issue-<N>` on branch `feat/focus-poll`,
   bootstrap gate + draft PR per resolve-ticket/worktrees skills.
4. Spec/plan/tasks per resolve-ticket; then dispatch the pair (quadrant built
   by splitting YOUR pane; launch commands above; brief them with
   `/home/paolino/.claude/skills/pair-programming/SKILL.md`).
5. Install the file protocol for your pair under your own nested runtime root;
   their staleness is your failure.

## Protocol (to me)
- Runtime root: `/tmp/ms-trenitalia-1/t-focus-poll/`. Append one line per
  milestone to `STATUS.md`:
  `<ISO-8601-UTC>  <TAG>  <msg>` with tags START / PLANNING / SLICE-START /
  SLICE-DONE / COMMIT / PUSHED / GATE-PASS / GATE-FAIL / BLOCKED / RESUMED /
  NOTE / COMPLETE. First action: append `START pane=%4984`.
- Blocked on a decision I should make → write
  `questions/Q-NNN-<slug>.md` (context, options, recommendation), log
  `BLOCKED Q-NNN-<slug>`, poll `answers/A-NNN-<slug>.md` every 30 s.
- Check `inbox/` for `NOTE-*.md` before starting a sub-step, after finishing
  one, and before logging COMPLETE.
- Do NOT use AskUserQuestion for anything I should arbitrate — Q-files only.
  AskUserQuestion in this pane is invisible to me.
- Auto-continue: between slices the default is to dispatch the next one; do
  not pause for permission. Real pause conditions: Q-file blocker, gate
  failure after one retry, contract touch, scope surprise.
- Commit shape: Conventional Commits, bisect-safe, one commit per slice,
  lint before push, PR body kept current, no AI attribution anywhere.
- Merge of YOUR PR: when CI is green and you have verified acceptance
  item-by-item, log COMPLETE and write a Q-file requesting merge
  authorization. Do not merge without my A-file. (Only PR #1 in Step 0 is
  pre-authorized.)

## Stop-and-ask (Q-file) conditions
- Any design that inflates the budget or changes REQUEST-BUDGET semantics.
- Any change to the staleness display semantics (parked).
- Anything touching `.github/workflows/` or Pages config.
- Gate/CI red you cannot green within one focused retry.

[DISPATCH-t-focus-poll-2026-07-29]
