/**
 * Cover art for the poster wall behind every page (see components/ArtBackdrop.tsx).
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
      coverImage { medium }
    }
  }
}`;

interface Raw {
  Page?: { media?: { id: number; coverImage?: { medium?: string | null } | null }[] };
}

export async function getBackdropCovers(): Promise<string[]> {
  "use cache";
  try {
    const data = await anilistQuery<Raw>(QUERY, { perPage: 24 });
    const covers = (data.Page?.media ?? [])
      .map((m) => m.coverImage?.medium)
      .filter((u): u is string => Boolean(u));
    cacheLife("days");
    return covers;
  } catch {
    // AniList down: no art this time, try again soon. The page works without it.
    cacheLife("minutes");
    return [];
  }
}
