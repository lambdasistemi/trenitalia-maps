// ── Direction-aware journey view ───────────────────────────────────────
// Every service is a shuttle (out → layover → back → layover), but the raw
// train state carries the FORWARD sense of the route: route[0]→route[end],
// segments oriented out-bound. Rendering that verbatim on the return leg
// shows a train driving away from its announced "next station" toward its
// claimed origin. This helper derives what the train is actually doing.

/** What the shuttle is driving right now: leg endpoints, adjacent stations
 *  in travel order, km covered on this leg, and terminus turnarounds. */
export function journeyView(t) {
  const total = t.totalKm ?? 0;

  if (!t.segments?.length) {
    // Placeholder from a station board: no geometry yet, trust the sample.
    return {
      origin: t.origin,
      destination: t.destination,
      lastStation: t.lastStation,
      nextStation: t.nextStation,
      legKm: t.progressKm ?? 0,
      atTerminus: false,
    };
  }

  const route = t.route;
  const seg = t.segments[Math.min(t.currentSegIdx ?? 0, t.segments.length - 1)];
  const atTerminus = t.direction === 0;
  // During a turnaround the train faces the leg it is about to drive:
  // at the far end (km ≈ total) that is the return leg.
  const back = t.direction < 0 || (atTerminus && total > 0 && t.progressKm >= total / 2);

  if (atTerminus) {
    const terminus = back ? route[route.length - 1] : route[0];
    return {
      origin: back ? route[route.length - 1] : route[0],
      destination: back ? route[0] : route[route.length - 1],
      lastStation: terminus,
      nextStation: terminus,
      legKm: 0,
      atTerminus: true,
    };
  }

  return {
    origin: back ? route[route.length - 1] : route[0],
    destination: back ? route[0] : route[route.length - 1],
    lastStation: back ? seg.to : seg.from,
    nextStation: back ? seg.from : seg.to,
    legKm: back ? total - t.progressKm : t.progressKm,
    atTerminus: false,
  };
}
