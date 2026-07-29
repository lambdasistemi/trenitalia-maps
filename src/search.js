// ── Search matching (pure — no DOM) ────────────────────────────────────
// Ranks stations and live trains against a free-text query.
// Case- and diacritic-insensitive; prefix > word-prefix > substring;
// major stations outrank minor ones at equal match quality.

const strip = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Match quality of `name` (already stripped) for query `q`: 0 = no match. */
function scoreName(name, q) {
  if (name.startsWith(q)) return 100;
  if (name.split(/[\s\-–./]+/).some(w => w.startsWith(q))) return 80;
  if (name.includes(q)) return 50;
  return 0;
}

const TIER_BONUS = [30, 10, 0];

/** Rank stations + trains for a query. Returns up to `limit` results:
 *  { kind: 'station' | 'train', ref, score } sorted best-first. */
export function searchAll(query, { stations = [], trains = [] }, limit = 8) {
  const q = strip(query.trim());
  if (!q) return [];

  const out = [];
  for (const s of stations) {
    const sc = scoreName(strip(s.name), q);
    if (sc) out.push({ kind: 'station', ref: s, score: sc + (TIER_BONUS[s.tier] ?? 0) });
  }
  const qCompact = q.replace(/\s+/g, '');
  for (const t of trains) {
    if (!t.number) continue;
    const num = strip(t.number);
    const sc = scoreName(num, q) ||
      (num.replace(/\s+/g, '').includes(qCompact) ? 60 : 0);
    if (sc) out.push({ kind: 'train', ref: t, score: sc });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
