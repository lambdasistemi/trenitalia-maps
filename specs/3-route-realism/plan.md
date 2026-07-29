# Implementation plan: realistic simulated service routes

## Technical context

The application is a browser-native ES module project tested with Node's
built-in test runner. Routes are paths through the adjacency list built from
`src/network.json`; edge distances and geometry already exist in `EDGES`.

The current defect is structural: `randomSimpleRoute` chooses an arbitrary
eligible station and stops by station count. The replacement must make
endpoint eligibility and accumulated kilometres part of route acceptance.

## Design

### Configuration

Move the supported service contracts into `CONFIG`, including weights, minimum
kilometres, maximum path nodes, traversal tier, endpoint tier, and the
256-attempt ceiling. The supported list contains only `regionale` and
`intercity`; Freccia is reserved for issue #8.

### Pure route generator

Replace or wrap the simple random walk with `randomServiceRoute`. Keep graph
and random dependencies injected so tests can use small fixtures and seeded
real-network runs. Return `{ route, edgeIdxs, totalKm }` only for a valid
endpoint and minimum distance; return `null` after the bounded attempts.

The implementation must remain simple-path based and must derive distance from
the exact edge indexes it returns.

### Simulator

Select a configured service contract, invoke the pure generator, and construct
segments exactly as today. Allow optional constructor injection of the random
function and train count for tests without changing the zero-argument browser
API.

### Proof

Add a focused route/simulator test module with a reusable property oracle.
Run it across deterministic seeds and the real graph. A deliberately invalid
generator must make the oracle throw. Retain the existing no-revisit unit
coverage, adapting it to the new API if needed.

### Documentation and smoke

Update the simulator section and tunables in `ARCHITECTURE.md`. After the
mechanical gate, run the app locally and pin one Regionale and one Intercity
train; record the displayed endpoint pairs and route kilometres in `WIP.md`.

## Slice

One vertical implementation slice is appropriate because configuration,
generator, simulator integration, tests, and documentation jointly form the
first bisect-safe state. Splitting the pure generator from its production
consumer would leave dead behavior, while splitting tests from behavior would
violate RED→GREEN.

Owned files:

- `src/config.js`
- `src/route.js`
- `src/simulator.js`
- `test/motion.test.js`
- `test/route.test.js`
- `ARCHITECTURE.md`

Forbidden files include scheduler/budget modules, `src/main.js`,
`src/train-glyph.js`, `src/map-renderer.js`, `src/network.json`, `.github/`,
and all files not listed above.

## Verification

Focused RED/GREEN:

```sh
node --test test/route.test.js test/motion.test.js
```

Full mechanical gate:

```sh
./gate.sh
```

The gate runs `git diff --check`, `npm test`, and `npm run build`.
