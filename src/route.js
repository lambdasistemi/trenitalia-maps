/** Build a non-repeating random walk through a rail adjacency list.
 *  Stops at a dead end instead of bouncing back through visited stations. */
export function randomSimpleRoute({
  adjacency,
  starts,
  length,
  maxTier,
  tierOf,
  random = Math.random,
}) {
  if (!starts.length || length <= 0) return { route: [], edgeIdxs: [] };

  let current = starts[Math.floor(random() * starts.length)];
  const route = [current];
  const edgeIdxs = [];
  const visited = new Set(route);

  while (route.length < length) {
    const choices = adjacency[current].filter(
      option => tierOf(option.to) <= maxTier && !visited.has(option.to),
    );
    if (!choices.length) break;

    const choice = choices[Math.floor(random() * choices.length)];
    edgeIdxs.push(choice.e);
    current = choice.to;
    route.push(current);
    visited.add(current);
  }

  return { route, edgeIdxs };
}
