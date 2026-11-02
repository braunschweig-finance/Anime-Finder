/**
 * Shared TypeScript types.
 *
 * "Types" describe the shape of our data so the editor can warn us when we
 * misspell a field or forget one. They don't run in the browser; they only
 * help while writing code.
 */

/** One anime, trimmed down to just what our result cards need. */
export interface Anime {
  id: number;
  /** English title if AniList has one, otherwise the romaji (Japanese in Latin letters) title. */
  title: string;
  /** Romaji title, shown when it differs from `title`. */
  romaji: string | null;
  /** Japanese title in Japanese script, e.g. 葬送のフリーレン. */
  native: string | null;
  /** Other names the show is known by (used for matching, not displayed). */
  synonyms: string[];
  coverImage: string | null;
  /** AniList's dominant cover color, used as a placeholder while the image loads. */
  coverColor: string | null;
  /** 0–100 score from AniList users, or null if not enough votes yet. */
  score: number | null;
  popularity: number;
  episodes: number | null;
  /** TV, MOVIE, OVA, ONA, TV_SHORT, SPECIAL, MUSIC */
  format: string | null;
  /** FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS */
  status: string | null;
  year: number | null;
  genres: string[];
  /** Non-spoiler tags, strongest first. */
  tags: { name: string; rank: number }[];
  /** Plain-text description, shortened for the card. */
  description: string;
  siteUrl: string;
  /** Legal streaming sites AniList lists for this show. */
  streaming: { site: string; url: string }[];
}

/** An anime plus the extra info each tab adds to explain the match. */
export interface AnimeResult extends Anime {
  /** Tab 1: one sentence on why you'll like it. */
  reason?: string;
  /** Tab 2: genres/tags it shares with the show you entered. */
  shared?: string[];
  /** Tab 3: how sure we are this is the show you're thinking of. */
  confidence?: "High" | "Medium" | "Low";
  /** Tab 3: which of your clues this show matches. */
  matchedClues?: string[];
}

/** The filters on the "Find my next anime" tab. Every field is optional. */
export interface SearchFilters {
  genre?: string;
  format?: "TV" | "MOVIE";
  status?: "FINISHED" | "RELEASING";
  episodesMin?: number;
  episodesMax?: number;
  minScore?: number;
  yearFrom?: number;
  yearTo?: number;
}

/** What every search API route sends back to the browser. */
export interface SearchResponse {
  results: AnimeResult[];
  /** "ai" when Gemini helped, "basic" when we used the plain AniList fallback. */
  mode: "ai" | "basic";
  /** A short message to show above results, e.g. when the fallback was used. */
  notice?: string;
  /** Tab 2 only: the show the user picked. */
  source?: AnimeResult;
}

/** The clue form on the "Forgot the name?" tab. */
export interface IdentifyClues {
  /** Everything the visitor remembers, in one free-text box (the current form). */
  description?: string;
  appearance?: string;
  characterNames?: string;
  plot?: string;
  setting?: string;
  timePeriod?: string;
  artStyle?: string;
  whenWatched?: string;
  other?: string;
}
