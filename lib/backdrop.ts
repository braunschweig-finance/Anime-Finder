/**
 * Cover art for the sliding poster strip behind the home page headline (components/Hero.tsx).
 *
 * "use cache" means Next.js fetches this once at build time and then refreshes
 * it at most once a day, so visitors never wait on AniList for the background.
 */
import { cacheLife } from "next/cache";
import { anilistQuery } from "./anilist";

const QUERY = `
query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false, format_in: [TV, MOVIE]) {
      id
      title { romaji }
      coverImage { large }
    }
  }
}`;

interface Raw {
  Page?: { media?: { id: number; coverImage?: { large?: string | null } | null }[] };
}

export async function getBackdropCovers(): Promise<string[]> {
  "use cache";
  try {
    const data = await anilistQuery<Raw>(QUERY, { perPage: 14 });
    const covers = (data.Page?.media ?? [])
      .map((m) => m.coverImage?.large)
      .filter((u): u is string => Boolean(u));
    cacheLife("days");
    return covers;
  } catch {
    // AniList down: no art this time, try again soon. The page works without it.
    cacheLife("minutes");
    return [];
  }
}
