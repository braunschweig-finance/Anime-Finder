/** Turn AniList codes into words people understand. Safe to use in the browser. */

export const FORMAT_LABEL: Record<string, string> = {
  TV: "TV", TV_SHORT: "TV short", MOVIE: "Movie", OVA: "OVA", ONA: "Web series",
  SPECIAL: "Special", MUSIC: "Music video",
};

export const STATUS_LABEL: Record<string, string> = {
  FINISHED: "Finished", RELEASING: "Airing", NOT_YET_RELEASED: "Upcoming",
  CANCELLED: "Cancelled", HIATUS: "On hiatus",
};

export function episodesLabel(n: number | null, format: string | null): string | null {
  if (format === "MOVIE") return null; // "Movie" already says it
  if (!n) return null;
  return n === 1 ? "1 episode" : `${n} episodes`;
}
