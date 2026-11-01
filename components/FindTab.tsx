"use client";
/** TAB 1 — describe what you want in plain English, get real picks with reasons. */
import { useEffect, useRef, useState } from "react";
import { EMPTY_FILTERS, Filters, type FilterValues } from "./Filters";
import { ResultList } from "./ResultList";
import { EmptyState, ErrorState, Notice, SkeletonList } from "./ResultStates";
import { useRequest } from "./useRequest";

const EXAMPLES = [
  "a sad fantasy about an elf who outlives her friends",
  "a hype battle anime with a found-family crew",
  "anime like Fire Force but already finished",
  "a cozy slice of life to fall asleep to",
  "a mind-game thriller with a genius villain",
];

const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof FilterValues)[];

function buildUrl(q: string, f: FilterValues) {
  const p = new URLSearchParams({ q });
  for (const k of FILTER_KEYS) if (f[k]) p.set(k, f[k]);
  return p;
}

/** Turn untrusted URL values into valid filter values (unknown ones become empty). */
function cleanFilters(raw: Partial<Record<keyof FilterValues, string>> = {}): FilterValues {
  const num = (v?: string) => (v && /^\d{1,4}$/.test(v) ? v : "");
  return {
    genre: raw.genre ?? "",
    format: raw.format === "TV" || raw.format === "MOVIE" ? raw.format : "",
    status: raw.status === "FINISHED" || raw.status === "RELEASING" ? raw.status : "",
    epMin: num(raw.epMin), epMax: num(raw.epMax), minScore: num(raw.minScore),
    yearFrom: num(raw.yearFrom), yearTo: num(raw.yearTo),
  };
}

export function FindTab({
  initialQuery = "",
  initialFilters,
}: {
  initialQuery?: string;
  initialFilters?: Partial<Record<keyof FilterValues, string>>;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterValues>(() => cleanFilters(initialFilters));
  const [lastQuery, setLastQuery] = useState(initialQuery.trim());
  const { state, run } = useRequest();
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [formError, setFormError] = useState("");

  function search(q = query, f = filters) {
    const clean = q.trim();
    if (clean.length < 2) {
      setFormError("Describe a show first, for example “a cozy fantasy with a found family.”");
      inputRef.current?.focus();
      return;
    }
    setFormError("");
    setLastQuery(clean);
    const params = buildUrl(clean, f);
    // Put the search in the address bar so it can be shared (great for TikTok links).
    window.history.replaceState(null, "", `/?${params}`);
    void run(`/api/search?${params}`);
    // Bring results into view on phones, where the search box fills most of the screen.
    if (window.innerWidth < 768) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }));
    }
  }

  // Opened from a shared link like /?q=cozy+fantasy? Run that search straight away.
  useEffect(() => {
    const q = initialQuery.trim();
    if (q.length >= 2) void run(`/api/search?${buildUrl(q, filters)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When filters change after a search, re-run it after a short pause, so typing
  // a year like 2015 doesn't fire four searches. This runs from the change event
  // itself rather than from an effect watching `filters`.
  const filterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function changeFilters(next: FilterValues) {
    setFilters(next);
    clearTimeout(filterTimer.current);
    if (lastQuery) filterTimer.current = setTimeout(() => search(lastQuery, next), 700);
  }

  return (
    <div>
      <form
        role="search"
        className="panel p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label htmlFor="find-input" className="block px-1 text-sm font-bold">
          Describe the show you want, in your own words
        </label>
        <textarea
          ref={inputRef}
          id="find-input"
          name="q"
          aria-invalid={formError ? true : undefined}
          aria-describedby={formError ? "find-error" : undefined}
          rows={3}
          maxLength={300}
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (formError) setFormError(""); }}
          onKeyDown={(e) => {
            // Enter searches; Shift+Enter makes a new line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              search();
            }
          }}
          placeholder="A sad fantasy about an elf who outlives her friends…"
          className="mt-1 block w-full resize-none bg-transparent px-1 py-2 text-lg leading-snug text-text placeholder:text-muted focus:outline-none sm:text-xl"
        />
        {formError && (
          <p id="find-error" role="alert" className="px-1 pb-2 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="px-1 text-xs tabular-nums text-muted" aria-hidden="true">
            {query.length}/300
          </span>
          <button
            type="submit"
            disabled={state.status === "loading"}
            aria-busy={state.status === "loading"}
            className="min-h-12 rounded-xl bg-sakura px-6 text-base font-bold text-sakura-ink hover:brightness-110 active:translate-y-px disabled:cursor-progress disabled:opacity-70"
          >
            {state.status === "loading" ? "Searching…" : "Find anime"}
          </button>
        </div>
      </form>

      <Filters value={filters} onChange={changeFilters} />

      <div ref={resultsRef} className="mt-6 scroll-mt-4">
        {state.status === "idle" && (
          <div>
            <p className="text-sm text-muted">Not sure what to type? Try one of these:</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(ex);
                      search(ex);
                    }}
                    className="min-h-10 rounded-full border border-line bg-surface px-4 py-2 text-left text-sm hover:border-sakura"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {state.status === "loading" && <SkeletonList />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => search(lastQuery)} />}
        {state.status === "done" && (
          <>
            {state.data.notice && <Notice>{state.data.notice}</Notice>}
            {state.data.results.length === 0 ? (
              <EmptyState
                title="No shows matched that"
                hint="Try different words, name a show you liked, or clear some filters."
              />
            ) : (
              <>
                <h2 role="status" className="mb-4 text-sm text-muted">
                  {state.data.results.length} picks for <span className="text-text">“{lastQuery}”</span>
                </h2>
                <ResultList results={state.data.results} numbered={state.data.mode === "ai"} sharedLabel="Matches" />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
