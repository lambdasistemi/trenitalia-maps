# tmux session "trenitalia" — rebuild guide

## window: trenitalia-maps-ms1-live-map (desk, SINGLETON 1 pane)
# Milestone owner's desk — conversational Claude session (operator interface).
# Launch: claude   (desk is the operator's conversation; load skill
# milestone-orchestrator on a bare start — it cold-starts from
# /code/llm-settings/shared/milestones.md)
# cwd: /code   runtime: /tmp/ms-trenitalia-1
# Resume paste: /milestone-orchestrator      (bare load; adopts ACTIVE entry)

## window: trenitalia-maps-ms1-t2-focus-poll (lane)
# Ticket-orchestrator, Codex.
# Launch: codex-raw --dangerously-bypass-approvals-and-sandbox -C /code/trenitalia-v2 -c model_reasoning_effort=high
# Resume paste: Read /tmp/ms-trenitalia-1/t-focus-poll/brief.md and your
#   /code/trenitalia-v2-issue-2/.orch/resume.md if present; continue from the
#   last line of /tmp/ms-trenitalia-1/t-focus-poll/STATUS.md.

## window: trenitalia-maps-ms1-t-unknown-route-realism (lane; rename pending issue#)
# Launch: codex-raw --dangerously-bypass-approvals-and-sandbox -C /code/trenitalia-v2 -c model_reasoning_effort=high
# Resume paste: Read /tmp/ms-trenitalia-1/t-route-realism/brief.md; continue
#   from the last line of /tmp/ms-trenitalia-1/t-route-realism/STATUS.md.

## window: trenitalia-maps-ms1-t-unknown-train-glyph (lane; rename pending issue#)
# Launch: codex-raw --dangerously-bypass-approvals-and-sandbox -C /code/trenitalia-v2 -c model_reasoning_effort=high
# Resume paste: Read /tmp/ms-trenitalia-1/t-train-glyph/brief.md; continue
#   from the last line of /tmp/ms-trenitalia-1/t-train-glyph/STATUS.md.

# Monitor (desk-owned, persistent): combined STATUS tail + STALE watchdog over
# /tmp/ms-trenitalia-1/t-*/STATUS.md, TMUX_NOTIFY_TARGET = desk pane.
