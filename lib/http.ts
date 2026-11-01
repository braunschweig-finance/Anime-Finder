/**
 * Small helpers shared by the API routes (app/api/*).
 */
import { AniListError, GENRES } from "./anilist";
import type { SearchFilters } from "./types";

/** JSON response. `cacheSeconds` lets Vercel's CDN reuse the answer for everyone. */
export function json(data: unknown, status = 200, cacheSeconds = 0): Response {
  return Response.json(data, {
    status,
    headers: cacheSeconds
      ? { "Cache-Control": `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 4}` }
      : { "Cache-Control": "no-store" },
  });
}

/** Turn any thrown error into a friendly JSON error the page can display. */
export function errorResponse(err: unknown): Response {
  if (err instanceof AniListError) {
    return json(
      {
        error: err.rateLimited
          ? "The anime database is getting a lot of requests right now. Wait a minute and try again."
          : "The anime database (AniList) isn't answering right now. Wait a minute, then tap Try again.",
      },
      503,
    );
  }
  console.error("[api] unexpected error:", err);
  return json({ error: "Something went wrong on our side. Try again in a moment." }, 500);
}

export const tooMany = () =>
  json({ error: "You're searching very fast. Wait a few seconds and try again." }, 429);

/** Read a whole number from the URL, ignoring anything outside [min, max]. */
function intParam(p: URLSearchParams, name: string, min: number, max: number): number | undefined {
  const v = Number.parseInt(p.get(name) ?? "", 10);
  return Number.isFinite(v) && v >= min && v <= max ? v : undefined;
}

/** Read and sanity-check the Tab 1 filters from the URL. Unknown values are ignored. */
export function parseFilters(p: URLSearchParams): SearchFilters {
  const genre = p.get("genre") ?? undefined;
  const format = p.get("format");
  const status = p.get("status");
  return {
    genre: genre && GENRES.includes(genre) ? genre : undefined,
    format: format === "TV" || format === "MOVIE" ? format : undefined,
    status: status === "FINISHED" || status === "RELEASING" ? status : undefined,
    episodesMin: intParam(p, "epMin", 1, 3000),
    episodesMax: intParam(p, "epMax", 1, 3000),
    minScore: intParam(p, "minScore", 1, 100),
    yearFrom: intParam(p, "yearFrom", 1940, 2100),
    yearTo: intParam(p, "yearTo", 1940, 2100),
  };
}
