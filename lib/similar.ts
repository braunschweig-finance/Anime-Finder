/**
 * TAB 2 — "If you liked…": similar shows, no AI involved.
 *
 * Two sources, combined:
 *   1. AniList users' recommendations for the show ("if you liked X, watch Y"),
 *      each with a vote count ("rating").
 *   2. Shows that share the original's strongest tags and genres.
 * Each result lists what it shares with the original, e.g. "Dark Fantasy, Time Skip".
 */
import "server-only";
import { Enum, getMediaWithRecs, searchMany, type PageSearch } from "./anilist";
import { TTLCache, cached } from "./cache";
import { onePerFranchise, sameFranchise } from "./franchise";
import type { Anime, AnimeResult, SearchResponse } from "./types";

const cache = new TTLCache<SearchResponse | null>(500, 12 * 60 * 60 * 1000);

export async function findSimilar(id: number): Promise<SearchResponse | null> {
  return cached(cache, String(id), () => computeSimilar(id));
}

async function computeSimilar(id: number): Promise<SearchResponse | null> {
  const base = await getMediaWithRecs(id);
  if (!base) return null;
  const src = base.media;

  // The original's defining tags: strong (rank ≥ 60) and not too generic.
  const keyTags = src.tags.filter((t) => t.rank >= 60).slice(0, 6).map((t) => t.name);
  const searches: PageSearch[] = [];
  const popular = [new Enum("POPULARITY_DESC")];
  keyTags.slice(0, 3).forEach((tag, i) => {
    searches.push({
      alias: `t${i}`,
      args: { tag_in: [tag], genre_in: src.genres.slice(0, 1), minimumTagRank: 60, sort: popular, id_not: src.id },
      perPage: 15,
    });
  });
  if (src.genres.length >= 2) {
    searches.push({ alias: "g", args: { genre_in: src.genres.slice(0, 3), sort: popular, id_not: src.id }, perPage: 15 });
  }
  // If the tag search fails (e.g. AniList busy), the recommendations alone are still useful.
  const found = await searchMany(searches).catch(() => ({}) as Record<string, Anime[]>);

  const pool = new Map<number, { a: Anime; recVotes: number }>();
  for (const { anime, rating } of base.recs) pool.set(anime.id, { a: anime, recVotes: Math.max(rating, 0) });
  for (const list of Object.values(found)) {
    for (const a of list) if (!pool.has(a.id)) pool.set(a.id, { a, recVotes: 0 });
  }
  pool.delete(src.id);

  const srcTags = new Map(src.tags.map((t) => [t.name, t.rank]));
  const ranked = onePerFranchise(
    [...pool.values()]
    // Skip other seasons/movies of the same franchise; you've probably seen them.
    .filter(({ a }) => !sameFranchise(src, a) && a.status !== "NOT_YET_RELEASED")
    .map(({ a, recVotes }) => {
      const sharedGenres = a.genres.filter((g) => src.genres.includes(g));
      // A tag "counts" as shared when it's reasonably strong in both shows.
      const sharedTags = a.tags
        .filter((t) => t.rank >= 50 && (srcTags.get(t.name) ?? 0) >= 50)
        .sort((x, y) => (srcTags.get(y.name)! + y.rank) - (srcTags.get(x.name)! + x.rank))
        .map((t) => t.name);
      const overlap = sharedGenres.length * 1.5 + sharedTags.length * 2;
      const score = Math.log2(1 + recVotes) * 3 + overlap + (a.score ?? 60) / 30;
      return { a, score, shared: [...sharedTags.slice(0, 4), ...sharedGenres.slice(0, 2)] };
    })
    .filter((r) => r.shared.length > 0 || r.score > 8)
    .sort((x, y) => y.score - x.score)
    .map(({ a, shared }) => ({ ...a, shared }) as AnimeResult),
    true,
  ).slice(0, 12);

  const results: AnimeResult[] = ranked;
  return { results, mode: "basic", source: src };
}
