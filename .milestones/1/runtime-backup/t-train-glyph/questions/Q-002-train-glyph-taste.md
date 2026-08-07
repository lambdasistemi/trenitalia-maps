# Choose the train-glyph precision treatment

## Context

Playwright MCP captured the real Vite app with 504 live trains. The existing
tapered, pointed-nose contour was not edited; the three candidates were
runtime-only rendering experiments:

- Baseline — current flat fill.
- A — subtle near-black halo, 1.16× behind the unchanged fill.
- B — stronger near-black halo, 1.28× behind the unchanged fill.
- C — A's subtle halo plus a restrained contrast lift to all four semantic
  train colors.

Side-by-side national zoom 1:

`/tmp/ms-trenitalia-1/t-train-glyph/playwright-output/candidates/side-by-side-zoom-1.png`

SHA-256:
`da1e848377783115e733d7eed061061b3e384e883065c6aa8393c49164c1322f`

Side-by-side city zoom 8:

`/tmp/ms-trenitalia-1/t-train-glyph/playwright-output/candidates/side-by-side-zoom-8.png`

SHA-256:
`db07c6accae3f4e6caf01ec87620c30d4876fa566f65a477b1e2201d0cbd3c4f`

The eight original 1440×900 captures are in the same `candidates/` directory
for full-resolution inspection.

## Options

1. A — restrained, but the difference is nearly lost in the national montage.
2. B — most consistently legible against rail lines and dense clusters while
   retaining the current colors.
3. C — crisp and bright, but changes the color character despite the request
   being specifically about precision.

## Recommendation

Choose **B**, then have the implementation pair tune the halo to a precise
screen-space thickness and prove it adds no per-frame material/geometry churn.
It is the only candidate visibly crisper at both supplied scales without
changing the contour or semantic palette.
