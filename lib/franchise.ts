/**
 * "Same show, different season" detection.
 *
 * AniList lists every season and movie separately (Frieren, Frieren Season 2,
 * …). Recommending five seasons of one show wastes the list, so we keep one
 * entry per franchise.
 */
import type { Anime } from "./types";

/** Season markers that come right after the show's name ("II", "2nd", "Season 3"…) and should be ignored. */
const SEASON_WORDS = /^(?:[ivx]+|\d+(?:st|nd|rd|th)?|season|part|cour|final|the)$/;

/** First three meaningful words of a title, e.g. "Mushoku Tensei II: Isekai…" → "mushoku tensei isekai". */
function head(title: string | null): string[] {
  if (!title) return [];
  const w = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  // Keep the first word even if it's a number ("86"), then drop season markers.
  return [w[0], ...w.slice(1).filter((x) => !SEASON_WORDS.test(x))].filter(Boolean).slice(0, 3) as string[];
}

function samePrefix(x: string[], y: string[]): boolean {
  const n = Math.min(3, x.length, y.length);
  return n > 0 && x.slice(0, n).join(" ") === y.slice(0, n).join(" ");
}

/**
 * Rough check: the first three words of the titles match, after ignoring
 * season markers (or all of the shorter title's words, if it has fewer).
 * "Sousou no Frieren" = "Sousou no Frieren 2nd Season", but
 * "Shingeki no Kyojin" ≠ "Shingeki no Bahamut".
 */
export function sameFranchise(a: Anime, b: Anime): boolean {
  if (a.id === b.id) return true;
  return samePrefix(head(a.romaji ?? a.title), head(b.romaji ?? b.title)) || samePrefix(head(a.title), head(b.title));
}

/**
 * Keep one entry per franchise, in the list's order.
 * With `preferFirstSeason`, the slot goes to the franchise's oldest entry
 * (usually season 1, where a new viewer should start).
 */
export function onePerFranchise<T extends Anime>(list: T[], preferFirstSeason = false): T[] {
  const groups: T[][] = [];
  for (const a of list) {
    const g = groups.find((grp) => sameFranchise(grp[0], a));
    if (g) g.push(a);
    else groups.push([a]);
  }
  return groups.map((g) => {
    if (!preferFirstSeason) return g[0];
    // Only TV-style entries can be "season 1"; a movie shouldn't replace the series.
    const series = g.filter((a) => a.format === "TV" || a.format === "ONA" || a.format === "TV_SHORT");
    const pool = series.length ? series : g;
    return pool.reduce((best, a) => ((a.year ?? 9999) < (best.year ?? 9999) ? a : best));
  });
}
