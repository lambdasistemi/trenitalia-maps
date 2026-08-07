# Contract registry — trenitalia-maps M1

contract:   REQUEST-BUDGET
parties:    scheduler/rate-limiter <-> every UI feature (zoom, pan, focus, search)
invariant:  outbound API request rate bounded by fixed global budget; features
            change ALLOCATION, never the number
enforced:   rate-limiter tryConsume gate + node tests; ARCHITECTURE.md states it.
            Focus reallocation (issue #2) must extend tests, not weaken the gate.

contract:   PAGES-DEPLOY
parties:    ci workflow (test) / deploy workflow <-> GitHub Pages site
invariant:  every main push deploys a working build to
            https://lambdasistemi.github.io/trenitalia-maps/
enforced:   deploy.yml on main + required 'test' check on protected main.
            NONE for post-deploy smoke (site-actually-renders is manual) —
            candidate check: a deploy-job curl + minimal DOM assert. Waiver
            pending: acceptable while release cadence is manual.

contract:   P2P-SAMPLE-INTEGRITY
parties:    e-p2p-caching (wire format) <-> e-p2p-security (trust mechanism)
invariant:  a peer must not be able to poison, forge, or replay shared samples
            into another viewer's map; verification spends only the fixed budget
enforced:   NONE — security epic exists to give it a mechanism; caching epic may
            not finalize a wire format without it (arbitrated at the desk)

contract:   VIAGGIATRENO-UPSTREAM
parties:    real-data epic (client/proxy) <-> viaggiatreno.it REST surface
invariant:  the app consumes the real ViaggiaTreno endpoints (HTTP-only, no
            CORS) politely: total load bounded by REQUEST-BUDGET regardless of
            viewer count; browser access requires a proxy (infra decision
            PENDING with operator)
enforced:   NONE — epic not yet founded; first enforcing artifact should be a
            contract test against the recorded API surface
