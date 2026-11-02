"use client";
/**
 * The three filters under "Find my next anime": genre, TV or movie, and length.
 * Always visible as one compact row of plain <select>s, so they work with
 * keyboards, screen readers, and the phone's native picker.
 */
import { GENRE_OPTIONS } from "@/lib/genres";

/** Rough show lengths. Each maps to an episode range the API understands (epMin/epMax). */
export const LENGTHS = {
  short: { label: "Short (≤13 eps)", min: 1, max: 13 },
  medium: { label: "Medium (14–26)", min: 14, max: 26 },
  long: { label: "Long (27–100)", min: 27, max: 100 },
  epic: { label: "Very long (100+)", min: 101, max: undefined },
} as const;
export type LengthId = keyof typeof LENGTHS;

export interface FilterValues {
  genre: string;
  format: "" | "TV" | "MOVIE";
  length: "" | LengthId;
}

export const EMPTY_FILTERS: FilterValues = { genre: "", format: "", length: "" };

/** How many filters are switched on. */
export const activeCount = (f: FilterValues) => Object.values(f).filter(Boolean).length;

/** Turn the filters into the URL parameters the search API reads. */
export function filterParams(f: FilterValues): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.genre) p.genre = f.genre;
  if (f.format) p.format = f.format;
  // Movies are one episode, so a length only applies to TV.
  if (f.length && f.format !== "MOVIE") {
    const { min, max } = LENGTHS[f.length];
    p.epMin = String(min);
    if (max) p.epMax = String(max);
  }
  return p;
}

/** Read filters back from a shared link (unknown values become empty). */
export function filtersFromParams(raw: Record<string, string | undefined> = {}): FilterValues {
  const genre = raw.genre && (GENRE_OPTIONS as readonly string[]).includes(raw.genre) ? raw.genre : "";
  const format = raw.format === "TV" || raw.format === "MOVIE" ? raw.format : "";
  const min = Number(raw.epMin) || undefined;
  const max = Number(raw.epMax) || undefined;
  const length = ((Object.keys(LENGTHS) as LengthId[]).find((k) => LENGTHS[k].min === min && LENGTHS[k].max === max) ?? "") as FilterValues["length"];
  return { genre, format, length };
}

const selectClass =
  "select-chevron h-11 w-full min-w-0 truncate rounded-xl border bg-surface pl-2.5 pr-7 text-[0.8125rem] text-text hover:border-muted sm:pl-3 sm:text-sm";

export function Filters({ value, onChange }: { value: FilterValues; onChange: (v: FilterValues) => void }) {
  const set = <K extends keyof FilterValues>(k: K, v: FilterValues[K]) => onChange({ ...value, [k]: v });
  const on = (v: string) => (v ? "border-accent" : "border-line");

  return (
    <fieldset className="mt-3">
      <legend className="sr-only">Filters</legend>
      <div className="grid grid-cols-3 gap-2">
        <select aria-label="Genre" name="genre" className={`${selectClass} ${on(value.genre)}`} value={value.genre} onChange={(e) => set("genre", e.target.value)}>
          <option value="">Any genre</option>
          {GENRE_OPTIONS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select aria-label="TV or movie" name="format" className={`${selectClass} ${on(value.format)}`} value={value.format} onChange={(e) => set("format", e.target.value as FilterValues["format"])}>
          <option value="">TV or movie</option>
          <option value="TV">TV series</option>
          <option value="MOVIE">Movie</option>
        </select>
        <select
          aria-label="Length"
          name="length"
          disabled={value.format === "MOVIE"}
          className={`${selectClass} ${on(value.format === "MOVIE" ? "" : value.length)} disabled:opacity-50`}
          value={value.format === "MOVIE" ? "" : value.length}
          onChange={(e) => set("length", e.target.value as FilterValues["length"])}
        >
          <option value="">Any length</option>
          {(Object.keys(LENGTHS) as LengthId[]).map((k) => (
            <option key={k} value={k}>{LENGTHS[k].label}</option>
          ))}
        </select>
      </div>
      {activeCount(value) > 0 && (
        <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="mt-1 min-h-10 px-1 text-sm text-sky underline underline-offset-4 hover:text-text">
          Clear filters
        </button>
      )}
    </fieldset>
  );
}
