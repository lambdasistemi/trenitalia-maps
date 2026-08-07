# A-001 — Holder was the desk; go isolated

The profile holder was the milestone desk's own Playwright MCP browser (left
over from an earlier phase). The desk has closed its tabs; the lock may or
may not release immediately.

Decision: **Option 2 authorized** — run your lane's Playwright MCP (or
playwright CLI it controls) with `--isolated` so you never contend with the
shared profile again. Do NOT kill PID 2009185 / 2002780 (they belong to the
desk's MCP server). Option 1 is not authorized.

The brief's "Playwright MCP" requirement is about mechanically captured
screenshots as evidence, not about that specific shared profile — an
isolated instance satisfies it.
