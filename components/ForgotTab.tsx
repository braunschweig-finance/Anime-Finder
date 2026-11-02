"use client";
/** TAB 3 — "Forgot the name?": fill in whatever you remember, get likely shows with a confidence label. */
import { useState } from "react";
import type { IdentifyClues } from "@/lib/types";
import { ResultList } from "./ResultList";
import { EmptyState, ErrorState, Notice, SkeletonList } from "./ResultStates";
import { useRequest } from "./useRequest";

type Field = { key: keyof IdentifyClues; label: string; placeholder: string; long?: boolean; extra?: boolean };

const FIELDS: Field[] = [
  { key: "appearance", label: "What a character looked like", placeholder: "Girl with pink hair and a big sword…" },
  { key: "characterNames", label: "Any character names", placeholder: "Shinra, or just part of a name…" },
  { key: "plot", label: "Things that happened", placeholder: "She fights demons to save her brother…", long: true },
  { key: "other", label: "Anything else", placeholder: "Opening song, a scene, a quote, how it ended…", long: true },
  { key: "setting", label: "Where it takes place", placeholder: "Tokyo, a magic school, space, another world…", extra: true },
  { key: "timePeriod", label: "Time period in the story", placeholder: "Feudal Japan, modern day, the future…", extra: true },
  { key: "artStyle", label: "Art style", placeholder: "Old 90s look, very colorful, dark and gritty…", extra: true },
  { key: "whenWatched", label: "Roughly when you watched it", placeholder: "Around 2012…", extra: true },
];

const EMPTY: IdentifyClues = {};
const inputClass =
  "mt-1 block w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-base font-normal text-text placeholder:text-muted focus:border-sky focus:outline-none focus-visible:ring-2 focus-visible:ring-sky/60";

export function ForgotTab() {
  const [clues, setClues] = useState<IdentifyClues>(EMPTY);
  const { state, run } = useRequest();
  const filled = Object.values(clues).filter((v) => v?.trim()).length;

  const [formError, setFormError] = useState("");
  // The less common questions stay folded away until asked for, so the form fits on a phone screen.
  const [showExtra, setShowExtra] = useState(false);

  function submit() {
    if (filled === 0) {
      setFormError("Fill in at least one detail, like a character's look or something that happened.");
      document.querySelector<HTMLInputElement>('[name="appearance"]')?.focus();
      return;
    }
    setFormError("");
    void run("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clues),
    });
  }

  return (
    <div>
      <form
        className="panel p-3 sm:p-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <p className="px-1 text-sm font-bold">Fill in anything you remember. One or two details is enough to start.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FIELDS.filter((f) => showExtra || !f.extra || clues[f.key]).map((f) => (
            <label key={f.key} className={`text-sm font-medium text-muted ${f.long ? "sm:col-span-2" : ""}`}>
              {f.label}
              {f.long ? (
                <textarea
                  name={f.key}
                  autoComplete="off"
                  rows={2}
                  maxLength={400}
                  className={`${inputClass} resize-y`}
                  placeholder={f.placeholder}
                  value={clues[f.key] ?? ""}
                  onChange={(e) => { const v = e.target.value; setClues((c) => ({ ...c, [f.key]: v })); }}
                />
              ) : (
                <input
                  name={f.key}
                  type="text"
                  autoComplete="off"
                  maxLength={200}
                  className={`${inputClass} h-12`}
                  placeholder={f.placeholder}
                  value={clues[f.key] ?? ""}
                  onChange={(e) => { const v = e.target.value; setClues((c) => ({ ...c, [f.key]: v })); }}
                />
              )}
            </label>
          ))}
        </div>
        {!showExtra && (
          <button
            type="button"
            onClick={() => setShowExtra(true)}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 px-1 text-sm font-bold text-sky hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add setting, time period, art style or when you watched it
          </button>
        )}
        {formError && (
          <p role="alert" className="mt-4 px-1 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={state.status === "loading"}
            aria-busy={state.status === "loading"}
            className="min-h-12 rounded-xl bg-accent px-6 text-base font-bold text-accent-ink hover:brightness-110 active:translate-y-px disabled:cursor-progress disabled:opacity-70"
          >
            {state.status === "loading" ? "Searching…" : "Find the show"}
          </button>
          {filled > 0 && (
            <button type="button" onClick={() => setClues(EMPTY)} className="min-h-10 px-1 text-sm text-sky underline underline-offset-4 hover:text-text">
              Clear form
            </button>
          )}
        </div>
      </form>

      <div className="mt-5">
        {state.status === "loading" && <SkeletonList count={4} />}
        {state.status === "error" && <ErrorState message={state.message} onRetry={submit} />}
        {state.status === "done" && (
          <>
            {state.data.notice && <Notice>{state.data.notice}</Notice>}
            {state.data.results.length === 0 ? (
              <EmptyState
                title="We couldn't place it yet"
                hint="Add another detail, like a character's name, a scene you remember, or roughly what year it was."
              />
            ) : (
              <>
                <h2 role="status" className="mb-4 text-sm text-muted">Could it be one of these?</h2>
                <ResultList results={state.data.results} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
