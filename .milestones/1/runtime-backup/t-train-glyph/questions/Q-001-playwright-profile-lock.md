# Playwright MCP profile is locked

## Context

The mandatory taste survey is ready against the issue #4 dev server at
`http://127.0.0.1:4174/`, but every Playwright MCP browser operation fails:

`Browser is already in use for /home/paolino/.cache/ms-playwright-mcp/mcp-chrome-927e945, use --isolated to run multiple instances of the same browser`

The holder is a live Chromium process rooted at PID 2009185 under Playwright
MCP PID 2002780. I have not killed it because it may belong to another lane.
Using a CLI screenshot instead would violate the brief's explicit Playwright
MCP requirement.

## Options

1. Authorize restarting the holder for profile `mcp-chrome-927e945`, after
   confirming it is stale.
2. Reconfigure/restart this lane's Playwright MCP server with `--isolated`.
3. Wait for the owning lane to close its MCP browser.

## Recommendation

Option 2 is safest because it avoids interfering with another lane while
preserving the required MCP evidence path. If that control is unavailable,
confirm the holder is stale and authorize option 1.
