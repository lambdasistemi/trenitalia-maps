# Shared-world ruling (read on resume; pause still holds)
Operator ruled PRODUCT: the map will show real current Trenitalia trains
(ViaggiaTreno). Your design's shared world is therefore the REAL upstream —
not a shared-seed simulator. Design the p2p layer as: real API behind the
fixed budget, samples authentic-at-origin, peers share fetched samples to
keep total upstream load ~one budget across all viewers. A real-data epic
will precede your implementation children; its client/proxy surface is the
upstream your wire format wraps. Infra (CORS proxy / signaling host) is an
operator decision still pending — keep both serverless and proxy-hosted
variants in the design space until the desk relays it.
