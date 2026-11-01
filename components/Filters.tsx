"use client";
/** The filter panel on "Find my next anime". Uses plain form controls so it works with keyboards and screen readers. */
import { useId, useState } from "react";
import { GENRE_OPTIONS } from "@/lib/genres";

export interface FilterValues {
  genre: string;
  format: "" | "TV" | "MOVIE";
  status: "" | "FINISHED" | "RELEASING";
  epMin: string;
  epMax: string;
  minScore: string;
  yearFrom: string;
  yearTo: string;
}

export const EMPTY_FILTERS: FilterValues = {
  genre: "", format: "", status: "", epMin: "", epMax: "", minScore: "", yearFrom: "", yearTo: "",
};

/** How many filters are switched on (shown on the toggle button). */
export const activeCount = (f: FilterValues) => Object.values(f).filter(Boolean).length;

const fieldClass =
  "mt-1 h-11 w-full rounded-lg border border-line bg-bg px-3 text-base text-text";

export function Filters({ value, onChange }: { value: FilterValues; onChange: (v: FilterValues) => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const set = <K extends keyof FilterValues>(k: K, v: FilterValues[K]) => onChange({ ...value, [k]: v });
  const count = activeCount(value);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-surface-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          Filters{count > 0 && <span className="rounded-full bg-sakura px-2 text-xs font-bold text-sakura-ink">{count}</span>}
        </button>
        {count > 0 && (
          <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="min-h-10 px-1 text-sm text-sky underline underline-offset-4 hover:text-text">
            Clear filters
          </button>
        )}
      </div>

      <fieldset id={panelId} hidden={!open} className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <legend className="sr-only">Filters</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <label className="col-span-2 text-sm font-medium sm:col-span-1">
            Genre
            <select name="genre" className={fieldClass} value={value.genre} onChange={(e) => set("genre", e.target.value)}>
              <option value="">Any genre</option>
              {GENRE_OPTIONS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Format
            <select name="format" className={fieldClass} value={value.format} onChange={(e) => set("format", e.target.value as FilterValues["format"])}>
              <option value="">TV or movie</option>
              <option value="TV">TV series</option>
              <option value="MOVIE">Movie</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Status
            <select name="status" className={fieldClass} value={value.status} onChange={(e) => set("status", e.target.value as FilterValues["status"])}>
              <option value="">Finished or airing</option>
              <option value="FINISHED">Finished</option>
              <option value="RELEASING">Airing now</option>
            </select>
          </label>
          <label className="col-span-2 text-sm font-medium sm:col-span-1">
            Minimum score
            <select name="minScore" className={fieldClass} value={value.minScore} onChange={(e) => set("minScore", e.target.value)}>
              <option value="">Any score</option>
              {[60, 70, 75, 80, 85].map((s) => (
                <option key={s} value={s}>{s}% or higher</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Episodes, at least
            <input className={fieldClass} type="number" inputMode="numeric" min={1} max={3000} name="epMin" autoComplete="off" placeholder="No minimum…"
              value={value.epMin} onChange={(e) => set("epMin", e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Episodes, at most
            <input className={fieldClass} type="number" inputMode="numeric" min={1} max={3000} name="epMax" autoComplete="off" placeholder="No limit…"
              value={value.epMax} onChange={(e) => set("epMax", e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            From year
            <input className={fieldClass} type="number" inputMode="numeric" min={1960} max={2100} name="yearFrom" autoComplete="off" placeholder="Any year…"
              value={value.yearFrom} onChange={(e) => set("yearFrom", e.target.value)} />
          </label>
          <label className="text-sm font-medium">
            To year
            <input className={fieldClass} type="number" inputMode="numeric" min={1960} max={2100} name="yearTo" autoComplete="off" placeholder="Any year…"
              value={value.yearTo} onChange={(e) => set("yearTo", e.target.value)} />
          </label>
        </div>
      </fieldset>
    </div>
  );
}
