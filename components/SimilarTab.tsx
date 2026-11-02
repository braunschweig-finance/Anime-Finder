"use client";
/**
 * TAB 2 — "If you liked…": type a title, pick it from AniList suggestions,
 * see similar shows and what they share. No AI involved.
 *
 * The input is an accessible "combobox": arrow keys move through suggestions,
 * Enter picks one, Escape closes the list.
 */
import { useEffect, useId, useRef, useState } from "react";
import { FORMAT_LABEL } from "@/lib/format";
import type { Suggestion } from "@/lib/anilist";
import { ResultList } from "./ResultList";
import { EmptyState, ErrorState, ExampleRow, SkeletonList } from "./ResultStates";
import { useRequest } from "./useRequest";

const QUICK_PICKS = ["Frieren", "One Piece", "Fire Force", "Jujutsu Kaisen", "Attack on Titan"];

export function SimilarTab({ initialId, initialTitle = "" }: { initialId?: string; initialTitle?: string }) {
  const [text, setText] = useState(initialTitle);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [suggestError, setSuggestError] = useState(false);
  const lastParams = useRef(""); // remembered for the "Try again" button
  const { state, run } = useRequest();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState("");
  // The text we put in the box ourselves (not typed), e.g. a title from a shared link.
  const quietText = useRef(initialTitle);

  // Fetch suggestions 250ms after the user stops typing.
  useEffect(() => {
    if (text === quietText.current) return;
    const q = text.trim();
    if (q.length < 2) return; // too short: the list is hidden (see showList below)
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const body = await res.json();
        setSuggestError(!res.ok);
        setSuggestions(body.suggestions ?? []);
        setActive(-1);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") { setSuggestError(true); setOpen(true); }
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [text]);

  /** Change the box text without opening the suggestion list. */
  function setTextQuietly(v: string) {
    quietText.current = v;
    setText(v);
  }

  function lookup(params: string) {
    lastParams.current = params;
    window.history.replaceState(null, "", `/?tab=similar&${params}`);
    // Once results arrive, show the show's official title in the box.
    void run(`/api/similar?${params}`).then((data) => {
      if (data?.source) setTextQuietly(data.source.title);
    });
  }

  function choose(s: Suggestion) {
    setTextQuietly(s.title);
    setOpen(false);
    lookup(`id=${s.id}`);
  }

  function submitTyped() {
    if (active >= 0 && suggestions[active]) return choose(suggestions[active]);
    const q = text.trim();
    if (q.length < 2) {
      setFormError("Type the name of a show you liked first.");
      inputRef.current?.focus();
      return;
    }
    setFormError("");
    setOpen(false);
    lookup(`title=${encodeURIComponent(q)}`);
  }

  // Shared links: /?tab=similar&id=154587 or &title=frieren
  useEffect(() => {
    if (initialId && /^\d+$/.test(initialId)) lookup(`id=${initialId}`);
    else if (initialTitle.trim().length >= 2) lookup(`title=${encodeURIComponent(initialTitle.trim())}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showList = open && text.trim().length >= 2;

  return (
    <div>
      <form role="search" className="panel z-10 p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); submitTyped(); }}>
        <label htmlFor="similar-input" className="block px-1 text-sm font-bold">
          Type an anime you liked, then pick it from the list
        </label>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              id="similar-input"
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? "similar-error" : undefined}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showList}
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              name="title"
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={80}
              value={text}
              placeholder="Frieren, One Piece, Fire Force…"
              onChange={(e) => { setText(e.target.value); if (formError) setFormError(""); }}
              onFocus={() => suggestions.length && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
                else if (e.key === "Escape") setOpen(false);
              }}
              className="h-14 w-full bg-transparent px-1 text-lg text-text placeholder:text-muted focus:outline-none sm:text-xl"
            />
            {showList && (
              <ul
                id={listId}
                role="listbox"
                aria-label="Matching shows"
                className="absolute inset-x-0 top-full z-20 mt-2 max-h-[min(24rem,60dvh)] overflow-auto overscroll-contain rounded-2xl border-2 border-text bg-surface p-1 shadow-[4px_4px_0_var(--ink)]"
              >
                {suggestError && <li className="px-3 py-3 text-sm text-danger">Suggestions aren&apos;t loading. Press Enter to search anyway.</li>}
                {!suggestError && suggestions.length === 0 && (
                  <li className="px-3 py-3 text-sm text-muted">No matching titles. Check the spelling, or try the Japanese name.</li>
                )}
                {suggestions.map((s, i) => (
                  <li
                    key={s.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => { e.preventDefault(); choose(s); }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 ${i === active ? "bg-surface-2" : ""}`}
                  >
                    {s.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.cover} alt="" width={36} height={50} className="h-[50px] w-9 rounded object-cover" loading="lazy" />
                    ) : (
                      <span className="h-[50px] w-9 rounded bg-surface-2" aria-hidden="true" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {[s.format ? FORMAT_LABEL[s.format] ?? s.format : null, s.year].filter(Boolean).join(", ")}
                        {s.native ? `  ${s.native}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={state.status === "loading"}
            aria-busy={state.status === "loading"}
            className="min-h-12 shrink-0 rounded-xl bg-accent px-6 text-base font-bold text-accent-ink hover:brightness-110 active:translate-y-px disabled:cursor-progress disabled:opacity-70"
          >
            {state.status === "loading" ? "Finding…" : "Show similar"}
          </button>
        </div>
        {formError && (
          <p id="similar-error" role="alert" className="px-1 pt-2 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
      </form>

      <div className="mt-6">
        {state.status === "idle" && (
          <ExampleRow
            label="Popular starting points:"
            items={QUICK_PICKS}
            onPick={(t) => { setTextQuietly(t); lookup(`title=${encodeURIComponent(t)}`); }}
          />
        )}
        {state.status === "loading" && <SkeletonList />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={() => lastParams.current && lookup(lastParams.current)} />}
        {state.status === "done" && (
          state.data.results.length === 0 ? (
            <EmptyState
              title="No close matches for this one"
              hint="AniList doesn't have enough data on this show yet. Try a more popular title you liked."
            />
          ) : (
            <>
              <h2 role="status" className="mb-4 text-sm text-muted">
                If you liked <span className="font-bold text-text">{state.data.source?.title}</span>, try these
              </h2>
              <ResultList results={state.data.results} />
            </>
          )
        )}
      </div>
    </div>
  );
}
