# Brief — ticket-orchestrator: train icon precision (trenitalia-maps)

## Identity
- Worker id: `t-train-glyph`. Your pane: `%4988`, window `@3405` (currently
  `trenitalia-maps-ms1-t-unknown-train-glyph` — rename to
  `trenitalia-maps-ms1-t<issue#>-train-glyph` once you file the issue).
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
Do NOT create your worktree until PR #1 is `MERGED`
(`gh pr view 1 --repo lambdasistemi/trenitalia-maps --json state --jq .state`,
poll every 60 s), then branch from fresh `origin/main`. Non-repo bootstrap
(issue, planner, window rename, visual survey) can proceed meanwhile.

## The ticket
Operator's words (Italian, verbatim): *"migliora l'icona del treno, in
precisione, forma ok"* — improve the train icon's PRECISION; the shape
(tapered, pointed-nose marker in `src/train-glyph.js`) is fine and stays.

Interpretation to validate: refine how the existing shape RENDERS — crisper
edges at the small constant screen size (currently a flat ShapeGeometry
scaled to ~0.28/zoom), better legibility against the dark map, precise
alignment of the visual nose with the heading. Candidate directions (your
spec decides, evidence first): thin dark outline/halo for edge definition,
device-pixel-ratio-aware sizing so edges land on pixel boundaries, slightly
higher-contrast fill, anti-aliasing quality at typical zooms, exact
nose-to-heading alignment.

**Taste checkpoint (mandatory):** early in the ticket, produce 2–3 candidate
renderings as side-by-side screenshots (Playwright MCP; the repo's dev
server) at national zoom and at city zoom, and raise a Q-file with the
screenshot paths and your recommendation. I will relay to the operator for
a taste pick BEFORE the pair implements the final version. Do not skip this
— taste is an operator decision.

Acceptance (observable; refine into the issue):
- The chosen refinement is visibly crisper than baseline in before/after
  screenshots at zoom 1 (national) and zoom ≥ 6 (city) — attach both to
  the PR.
- Glyph nose visually aligns with direction of travel (no perceptible
  offset at city zoom).
- No regression: shape contour unchanged (`train-glyph.js` test still
  passes), delay colors and stale fading intact, 60 fps with ~500 trains
  (no per-frame material/geometry churn).
- Docs: PR body carries the before/after; ARCHITECTURE unchanged unless
  the rendering approach changes.

Relevant modules (your spec owns the fence): `src/map-renderer.js` (train
mesh creation/update), `src/train-glyph.js` (contour stays; resolution may
change if outline needs it), `src/config.js` (colors/sizes), `src/style.css`
only if a CSS-layer effect is chosen. Out of scope: scheduler/api/cache
(t-focus-poll's files), simulator/route generation (t-route-realism's
files), `.github/`.

## Merge order (binding)
Serialized: t-focus-poll → t-route-realism → YOU. Rebase onto main after the
preceding merges; never merge without my A-file authorization (Q-file when
green + acceptance verified item-by-item).

## Bootstrap (all yours)
1. File the issue (label `feat`, assignee `paolino`, milestone M1); add to
   planner (field IDs:
   `/home/paolino/.claude/projects/-code/memory/project_planner_field_ids.md`).
2. Rename window to `trenitalia-maps-ms1-t<issue#>-train-glyph`.
3. After the sequencing gate: worktree `/code/trenitalia-v2-issue-<N>`,
   branch `feat/train-glyph-precision`, gate + draft PR.
4. Spec/plan/tasks; dispatch the pair (quadrant by splitting YOUR pane;
   pair brief points at `/home/paolino/.claude/skills/pair-programming/SKILL.md`).
5. Install the file protocol for your pair under your nested runtime root.

## Protocol (to me)
- Runtime root `/tmp/ms-trenitalia-1/t-train-glyph/`; append one line per
  milestone to `STATUS.md`: `<ISO-8601-UTC>  <TAG>  <msg>`; tags START /
  PLANNING / SLICE-START / SLICE-DONE / COMMIT / PUSHED / GATE-PASS /
  GATE-FAIL / BLOCKED / RESUMED / NOTE / COMPLETE. First action: append
  `START pane=%4988`.
- Decisions I should make → `questions/Q-NNN-<slug>.md` + `BLOCKED` line;
  poll `answers/A-NNN-<slug>.md` every 30 s. Check `inbox/` for `NOTE-*.md`
  before each sub-step, after each, and before COMPLETE.
- NO AskUserQuestion for anything I should arbitrate — invisible to me.
- Auto-continue between slices; real pauses only: Q-blocker, gate failure
  after one retry, taste checkpoint, contract/scope surprise.
- Conventional Commits, bisect-safe, one commit per slice, lint before push,
  PR body current, no AI attribution.

## Stop-and-ask
- The taste checkpoint above (mandatory Q-file with screenshots).
- Wanting to change the glyph SHAPE (operator said shape is ok).
- Touching files owned by the other lanes.
- Anything in `.github/` or Pages.

[DISPATCH-t-train-glyph-2026-07-29]
