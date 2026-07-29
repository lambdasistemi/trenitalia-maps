# Tasks: focus-aware request allocation

## Slice A — normative architecture record

- [ ] T201 Document due-focus promotion as fixed-budget slot reallocation in `ARCHITECTURE.md`.
- [ ] T202 Document the focused-only fresh-cache path, unpin reset, tunable cadence, and unchanged staleness semantics.

Commit subject: `docs: define focused polling allocation`

Owned files: `ARCHITECTURE.md`

## Slice B — vertical focus allocation

- [ ] T203 Add the 10-second focus tunable and scheduler focus lifecycle.
- [ ] T204 Promote a due focused train within the unchanged limiter and per-tick cap.
- [ ] T205 Add focused-only fresh train progress while preserving normal TTL caching and in-flight coalescing.
- [ ] T206 Wire click pin, search pin, and every unpin path to scheduler focus state.
- [ ] T207 Prove focus cadence and complete reset after unpin with deterministic tests.
- [ ] T208 Prove budget conservation and the cache-hit negative/control cases with deterministic tests.
- [ ] T209 Pass the focused test, full gate, and live browser smoke.

Commit subject: `feat: prioritize pinned train refreshes`

Owned files: `src/config.js`, `src/scheduler.js`, `src/api-client.js`,
`src/main.js`, `test/focus-poll.test.js`

## Orchestrator-owned finalization

- [ ] T210 Independently rerun the gate, audit commits and acceptance evidence, refresh the PR body, mark ready, and request merge authorization.
