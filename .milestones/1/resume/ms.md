# Resume — milestone owner, trenitalia-maps M1
1. You are the desk. Do not code. Asks / answers / sweeps only.
2. Read /tmp/ms-trenitalia-1/STATUS.md and each t-*/STATUS.md tail; re-arm the
   Monitor (tail + STALE watchdog, session.md bottom) if not running.
3. Answer any unanswered questions/ in the three lane roots.
4. Merge order is serialized: focus-poll -> route-realism -> train-glyph.
   Lanes request merge authorization via Q-file; you authorize; the LANE runs
   guard-merge.
5. Queued dispatches: (a) persistenza query/view — dispatch when t-focus-poll
   merges (fence overlap main.js/ui.js); (b) campi di ricerca/selezione —
   blocked on operator clarification.
6. Parked operator decision: staleness display semantics (see ledger.md).
7. Sweep this ledger on every transition (script:
   /code/llm-settings/shared/skills/milestone-orchestrator/scripts/ledger-sweep.sh
   with MS_SWEEP_ROOT=/tmp/ms-trenitalia-1, repo
   git@github.com:lambdasistemi/trenitalia-maps.git, N=1).
