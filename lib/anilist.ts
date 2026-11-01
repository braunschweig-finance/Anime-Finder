/**
 * Everything that talks to AniList (https://anilist.co), the free anime database.
 *
 * AniList uses GraphQL: instead of many URLs, there is one URL and we send a
 * "query" describing exactly which fields we want back.
 *
 * Rate limits: AniList allows roughly 90 requests per minute per server (it
 * sometimes drops to 30). We keep things polite by:
 *   1. caching every answer for a while (see cache.ts),
 *   2. bundling several searches into ONE request using GraphQL "aliases",
 *   3. spacing requests out and running at most 2 at the same time,
 *   4. waiting and retrying once if AniList says "slow down" (HTTP 429).
 */
import { TTLCache, cached } from "./cache";
import type { Anime, SearchFilters } from "./types";

const ANILIST_URL = process.env.ANILIST_API_URL || "https://graphql.anilist.co";

/** Thrown when AniList is unreachable, rate-limiting us, or returns an error. */
export class AniListError extends Error {
  constructor(
    message: string,
    public readonly rateLimited = false,
  ) {
    super(message);
    this.name = "AniListError";
  }
}

/* ------------------------------------------------------------------ */
/* Polite request queue                                                */
/* ------------------------------------------------------------------ */

const MAX_CONCURRENT = 2;
const MIN_GAP_MS = 350; // ~170/min ceiling; caching keeps real usage far lower
let active = 0;
let lastStart = 0;
const waiting: (() => void)[] = [];

async function takeSlot(): Promise<void> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  active++;
  const wait = lastStart + MIN_GAP_MS - Date.now();
  lastStart = Math.max(Date.now(), lastStart + MIN_GAP_MS);
  if (wait > 0) await sleep(wait);
}

function releaseSlot(): void {
  active--;
  waiting.shift()?.();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cache raw AniList answers for an hour. */
const responseCache = new TTLCache<unknown>(500, 60 * 60 * 1000);

/**
 * Send one GraphQL query to AniList and return its `data`.
 * Results are cached by query text + variables.
 */
export async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const key = query + JSON.stringify(variables);
  return cached(responseCache as TTLCache<T>, key, () => sendWithRetry<T>(query, variables));
}

async function sendWithRetry<T>(
  query: string,
  variables: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  await takeSlot();
  let res: Response;
  try {
    res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    releaseSlot();
    console.error("[anilist] network error:", err);
    throw new AniListError("Couldn't reach the anime database.");
  }
  releaseSlot();

  if (res.status === 429) {
    // AniList tells us how many seconds to wait. Retry once if it's short.
    const retryAfter = Number(res.headers.get("retry-after") ?? "60");
    if (attempt === 0 && retryAfter <= 5) {
      await sleep(retryAfter * 1000 + 250);
      return sendWithRetry<T>(query, variables, attempt + 1);
    }
    throw new AniListError("The anime database is busy right now.", true);
  }

  let body: { data?: T; errors?: { message: string; status?: number }[] };
  try {
    body = await res.json();
  } catch {
    throw new AniListError(`The anime database sent an unreadable reply (HTTP ${res.status}).`);
  }

  // AniList returns 404 + "Not Found." when you ask for an id that doesn't exist.
  // For our purposes that's "no data", not a crash.
  if (body.errors?.length && !body.data) {
    const notFound = body.errors.every((e) => e.status === 404);
    if (notFound) return {} as T;
    console.error("[anilist] errors:", body.errors);
    if (res.status >= 500 && attempt === 0) {
      await sleep(600);
      return sendWithRetry<T>(query, variables, attempt + 1);
    }
    throw new AniListError("The anime database returned an error.");
  }
  return (body.data ?? {}) as T;
}

/* ------------------------------------------------------------------ */
/* Fields we ask for on every show                                     */
/* ------------------------------------------------------------------ */

export const MEDIA_FIELDS = `
  id
  title { romaji english native }
  synonyms
  coverImage { large color }
  averageScore
  popularity
  episodes
  format
  status
  seasonYear
  startDate { year }
  genres
  tags { name rank isMediaSpoiler isAdult }
  description(asHtml: false)
  siteUrl
  isAdult
  externalLinks { site url type isDisabled }
`;

/** The raw shape AniList returns for MEDIA_FIELDS. */
export interface RawMedia {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  synonyms: string[] | null;
  coverImage: { large: string | null; color: string | null } | null;
  averageScore: number | null;
  popularity: number | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  seasonYear: number | null;
  startDate: { year: number | null } | null;
  genres: string[] | null;
  tags: { name: string; rank: number; isMediaSpoiler: boolean; isAdult: boolean }[] | null;
  description: string | null;
  siteUrl: string;
  isAdult: boolean | null;
  externalLinks: { site: string; url: string; type: string | null; isDisabled: boolean | null }[] | null;
}

/** Streaming sites we list first, because most viewers have them. */
const PREFERRED_STREAMERS = ["Crunchyroll", "Netflix", "Hulu", "HIDIVE", "Amazon Prime Video", "Disney Plus", "Max"];

/** Convert AniList's raw answer into our tidy `Anime` shape. */
export function toAnime(m: RawMedia): Anime {
  const title = m.title.english || m.title.romaji || m.title.native || "Untitled";
  const streaming = (m.externalLinks ?? [])
    .filter((l) => l.type === "STREAMING" && !l.isDisabled && /^https?:\/\//.test(l.url))
    .filter((l, i, all) => all.findIndex((x) => x.site === l.site) === i)
    .sort((a, b) => rankStreamer(a.site) - rankStreamer(b.site))
    .slice(0, 3)
    .map((l) => ({ site: l.site, url: l.url }));

  return {
    id: m.id,
    title,
    romaji: m.title.romaji && m.title.romaji !== title ? m.title.romaji : null,
    native: m.title.native,
    synonyms: m.synonyms ?? [],
    coverImage: m.coverImage?.large ?? null,
    coverColor: m.coverImage?.color ?? null,
    score: m.averageScore,
    popularity: m.popularity ?? 0,
    episodes: m.episodes,
    format: m.format,
    status: m.status,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    genres: (m.genres ?? []).filter((g) => g !== "Hentai"),
    tags: (m.tags ?? [])
      .filter((t) => !t.isMediaSpoiler && !t.isAdult)
      .sort((a, b) => b.rank - a.rank)
      .map((t) => ({ name: t.name, rank: t.rank })),
    description: cleanDescription(m.description),
    siteUrl: m.siteUrl,
    streaming,
  };
}

function rankStreamer(site: string): number {
  const i = PREFERRED_STREAMERS.indexOf(site);
  return i === -1 ? 99 : i;
}

/** AniList descriptions contain bits of HTML and source credits. Make them plain text. */
export function cleanDescription(raw: string | null): string {
  if (!raw) return "";
  const text = raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/~!.*?!~/gs, "") // AniList spoiler markup
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/\[Written by[^\]]*\]/gi, "")
    .replace(/Note:.*$/is, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 280) return text;
  const cut = text.slice(0, 280);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

/* ------------------------------------------------------------------ */
/* Building queries                                                    */
/* ------------------------------------------------------------------ */

/** Marks a value as a GraphQL enum (written without quotes, e.g. POPULARITY_DESC). */
export class Enum {
  constructor(public readonly value: string) {}
}

type ArgValue = string | number | boolean | Enum | ArgValue[] | undefined | null;

/** Turn a JS value into GraphQL argument syntax. JSON string escaping is valid GraphQL. */
function gqlValue(v: ArgValue): string {
  if (v instanceof Enum) {
    if (!/^[A-Z_]+$/.test(v.value)) throw new Error("bad enum");
    return v.value;
  }
  if (Array.isArray(v)) return `[${v.map(gqlValue).join(", ")}]`;
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}

function gqlArgs(args: Record<string, ArgValue>): string {
  return Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${gqlValue(v)}`)
    .join(", ");
}

/** Convert our filter form into AniList search arguments. */
export function filterArgs(f: SearchFilters = {}): Record<string, ArgValue> {
  return {
    genre: f.genre,
    format_in: f.format === "TV" ? [new Enum("TV"), new Enum("TV_SHORT"), new Enum("ONA")]
      : f.format === "MOVIE" ? [new Enum("MOVIE")] : undefined,
    status: f.status ? new Enum(f.status) : undefined,
    // AniList's "greater/lesser" are exclusive, so shift by one to make them inclusive.
    episodes_greater: f.episodesMin ? f.episodesMin - 1 : undefined,
    episodes_lesser: f.episodesMax ? f.episodesMax + 1 : undefined,
    averageScore_greater: f.minScore ? f.minScore - 1 : undefined,
    startDate_greater: f.yearFrom ? f.yearFrom * 10000 : undefined, // FuzzyDate: YYYYMMDD
    startDate_lesser: f.yearTo ? (f.yearTo + 1) * 10000 : undefined,
  };
}

/** Double-check a show against the filters (title searches can slip past them). */
export function matchesFilters(a: Anime, f: SearchFilters = {}): boolean {
  if (f.genre && !a.genres.includes(f.genre)) return false;
  if (f.format === "TV" && !["TV", "TV_SHORT", "ONA"].includes(a.format ?? "")) return false;
  if (f.format === "MOVIE" && a.format !== "MOVIE") return false;
  if (f.status && a.status !== f.status) return false;
  if (f.episodesMin && (a.episodes ?? 0) < f.episodesMin) return false;
  if (f.episodesMax && (a.episodes == null || a.episodes > f.episodesMax)) return false;
  if (f.minScore && (a.score ?? 0) < f.minScore) return false;
  if (f.yearFrom && (a.year ?? 0) < f.yearFrom) return false;
  if (f.yearTo && (a.year ?? 9999) > f.yearTo) return false;
  return true;
}

export interface PageSearch {
  /** A name for this search so we can find its results (letters/numbers only). */
  alias: string;
  args: Record<string, ArgValue>;
  perPage?: number;
}

/**
 * Run several anime searches in ONE request to AniList.
 * Returns each search's results under its alias.
 */
export async function searchMany(searches: PageSearch[]): Promise<Record<string, Anime[]>> {
  // AniList rejects queries that are too "complex", so we send at most 5 searches per request.
  const CHUNK = 5;
  const out: Record<string, Anime[]> = {};
  const chunks: PageSearch[][] = [];
  for (let i = 0; i < searches.length; i += CHUNK) chunks.push(searches.slice(i, i + CHUNK));

  await Promise.all(
    chunks.map(async (chunk) => {
      const parts = chunk.map(({ alias, args, perPage = 20 }) => {
        const a = gqlArgs({ type: new Enum("ANIME"), isAdult: false, ...args });
        return `${alias}: Page(perPage: ${perPage}) { media(${a}) { ${MEDIA_FIELDS} } }`;
      });
      const data = await anilistQuery<Record<string, { media: RawMedia[] } | null>>(
        `query { ${parts.join("\n")} }`,
      );
      for (const { alias } of chunk) {
        out[alias] = (data[alias]?.media ?? []).filter((m) => !m.isAdult).map(toAnime);
      }
    }),
  );
  return out;
}

/* ------------------------------------------------------------------ */
/* Specific lookups                                                    */
/* ------------------------------------------------------------------ */

export interface Suggestion {
  id: number;
  title: string;
  native: string | null;
  year: number | null;
  format: string | null;
  cover: string | null;
}

const LITE_FIELDS = `id title { romaji english native } synonyms coverImage { medium } format seasonYear startDate { year } isAdult popularity`;
type LiteMedia = Pick<RawMedia, "id" | "title" | "synonyms" | "format" | "seasonYear" | "startDate" | "isAdult" | "popularity"> & {
  coverImage: { medium: string | null } | null;
};

function toSuggestion(m: LiteMedia): Suggestion {
  return {
    id: m.id,
    title: m.title.english || m.title.romaji || m.title.native || "Untitled",
    native: m.title.native,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    format: m.format,
    cover: m.coverImage?.medium ?? null,
  };
}

/**
 * AniList's search only matches whole words, so "frie" finds nothing even
 * though "frieren" works. To make typing feel instant, we also keep a list of
 * the ~500 most popular shows (refreshed daily) and match the start of any word
 * in their titles. Loading it takes a few seconds, so the first visitors after
 * a restart wait up to 3 seconds for it to load.
 */
const popularCache = new TTLCache<LiteMedia[]>(1, 24 * 60 * 60 * 1000);
let popularLoading: Promise<LiteMedia[]> | null = null;

/**
 * The popular-titles index. After a restart it isn't loaded yet, so we wait for it,
 * but never more than `maxWaitMs`: a slow AniList shouldn't make typing feel stuck.
 * (Without this, a cold server answered "frie" with nothing, and the CDN kept that empty answer.)
 */
async function popularIndex(maxWaitMs = 3000): Promise<LiteMedia[]> {
  const hit = popularCache.get("popular");
  if (hit) return hit;
  const loading = startPopularLoad();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<LiteMedia[]>((resolve) => { timer = setTimeout(() => resolve([]), maxWaitMs); });
  return Promise.race([loading, timeout]).finally(() => clearTimeout(timer));
}

function startPopularLoad(): Promise<LiteMedia[]> {
  if (!popularLoading) {
    const parts = Array.from({ length: 5 }, (_, i) =>
      `p${i}: Page(page: ${i + 1}, perPage: 50) { media(type: ANIME, isAdult: false, sort: [POPULARITY_DESC]) { ${LITE_FIELDS} } }`,
    );
    popularLoading = anilistQuery<Record<string, { media: LiteMedia[] } | null>>(`query { ${parts.join("\n")} }`)
      .then((data) => {
        const list = Object.values(data).flatMap((p) => p?.media ?? []).filter((m) => !m.isAdult);
        popularCache.set("popular", list);
        return list;
      })
      .catch((err) => {
        console.error("[anilist] couldn't load popular titles:", err);
        return [];
      })
      .finally(() => { popularLoading = null; });
  }
  return popularLoading;
}

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);

/** Does every word the user typed start a word in one of the show's titles? ("atta tit" → Attack on Titan) */
function prefixMatch(q: string, m: LiteMedia): boolean {
  const typed = words(q);
  if (typed.length === 0) return false;
  return [m.title.english, m.title.romaji, ...(m.synonyms ?? [])].some((t) => {
    if (!t) return false;
    const w = words(t);
    return typed.every((tw) => w.some((x) => x.startsWith(tw)));
  });
}

/** Title suggestions for the "If you liked..." autocomplete box. */
export async function autocomplete(q: string): Promise<Suggestion[]> {
  // The index and AniList's own search run at the same time.
  const [index, data] = await Promise.all([popularIndex(), anilistQuery<{ Page: { media: LiteMedia[] } }>(
    `query ($q: String) {
      Page(perPage: 8) {
        media(search: $q, type: ANIME, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) { ${LITE_FIELDS} }
      }
    }`,
    { q },
  )]);
  const local = index.filter((m) => prefixMatch(q, m)).slice(0, 5);
  // Popular prefix matches first (most likely what you're typing), then AniList's own matches.
  const seen = new Set<number>();
  return [...local, ...(data.Page?.media ?? [])]
    .filter((m) => !m.isAdult && !seen.has(m.id) && seen.add(m.id))
    .slice(0, 8)
    .map(toSuggestion);
}

export interface MediaWithRecs {
  media: Anime;
  recs: { anime: Anime; rating: number }[];
}

/** One show plus AniList users' "if you liked this, try..." list. */
export async function getMediaWithRecs(id: number): Promise<MediaWithRecs | null> {
  const data = await anilistQuery<{
    Media: (RawMedia & {
      recommendations: { nodes: { rating: number; mediaRecommendation: RawMedia | null }[] };
    }) | null;
  }>(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        recommendations(sort: [RATING_DESC], perPage: 25) {
          nodes { rating mediaRecommendation { ${MEDIA_FIELDS} } }
        }
      }
    }`,
    { id },
  );
  if (!data.Media) return null;
  return {
    media: toAnime(data.Media),
    recs: data.Media.recommendations.nodes
      .filter((n) => n.mediaRecommendation && !n.mediaRecommendation.isAdult)
      .map((n) => ({ anime: toAnime(n.mediaRecommendation!), rating: n.rating })),
  };
}

export interface CharacterHit {
  name: string;
  /** Anime the character appears in. */
  media: Anime[];
}

/** Search characters by name (several names in one request). */
export async function searchCharacters(names: string[]): Promise<Record<string, CharacterHit[]>> {
  const clean = names.map((n) => n.trim()).filter(Boolean).slice(0, 4);
  if (clean.length === 0) return {};
  const parts = clean.map(
    (name, i) => `c${i}: Page(perPage: 4) {
      characters(search: ${JSON.stringify(name)}, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
        name { full native alternative }
        media(type: ANIME, sort: [POPULARITY_DESC], perPage: 3) { nodes { ${MEDIA_FIELDS} } }
      }
    }`,
  );
  type RawChar = { name: { full: string | null }; media: { nodes: RawMedia[] } | null };
  const data = await anilistQuery<Record<string, { characters: RawChar[] } | null>>(
    `query { ${parts.join("\n")} }`,
  );
  const out: Record<string, CharacterHit[]> = {};
  clean.forEach((name, i) => {
    out[name] = (data[`c${i}`]?.characters ?? []).map((c) => ({
      name: c.name.full ?? name,
      media: (c.media?.nodes ?? []).filter((m) => !m.isAdult).map(toAnime),
    }));
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* The official list of genres and tags                                */
/* ------------------------------------------------------------------ */

export interface Vocabulary {
  genres: string[];
  tags: { name: string; category: string }[];
}

const vocabCache = new TTLCache<Vocabulary>(1, 24 * 60 * 60 * 1000);

/**
 * Every genre and tag AniList knows. We use this to throw away any genre or tag
 * Gemini suggests that doesn't really exist, and for the no-AI fallback search.
 */
export async function getVocabulary(): Promise<Vocabulary> {
  return cached(vocabCache, "vocab", async () => {
    const data = await anilistQuery<{
      GenreCollection: string[];
      MediaTagCollection: { name: string; category: string; isAdult: boolean }[];
    }>(`query { GenreCollection MediaTagCollection { name category isAdult } }`);
    return {
      genres: (data.GenreCollection ?? []).filter((g) => g !== "Hentai"),
      tags: (data.MediaTagCollection ?? [])
        .filter((t) => !t.isAdult)
        .map((t) => ({ name: t.name, category: t.category })),
    };
  });
}

export { GENRE_OPTIONS as GENRES } from "./genres";
