"use client";
/** TAB 3 — "Forgot the name?": describe whatever you remember in one box, get likely shows with a confidence label. */
import { useRef, useState } from "react";
import { ResultList } from "./ResultList";
import { EmptyState, ErrorState, Notice, SkeletonList } from "./ResultStates";
import { useRequest } from "./useRequest";

export function ForgotTab() {
  const [text, setText] = useState("");
  const { state, run } = useRequest();
  const [formError, setFormError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const description = text.trim();
    if (description.length < 3) {
      setFormError("Describe anything you remember, like a character's look or something that happened.");
      inputRef.current?.focus();
      return;
    }
    setFormError("");
    void run("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  }

  return (
    <div>
      <form
        className="panel p-3 sm:p-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="forgot-input" className="block px-1 text-sm font-bold">
          Describe anything you remember about the show
        </label>
        <textarea
          ref={inputRef}
          id="forgot-input"
          name="description"
          aria-invalid={formError ? true : undefined}
          aria-describedby={formError ? "forgot-error" : undefined}
          rows={2}
          maxLength={600}
          autoComplete="off"
          enterKeyHint="search"
          value={text}
          onChange={(e) => { setText(e.target.value); if (formError) setFormError(""); }}
          onKeyDown={(e) => {
            // Enter searches; Shift+Enter makes a new line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="A girl with pink hair and a huge sword fights demons to save her brother…"
          className="mt-1 block w-full resize-none bg-transparent px-1 py-2 text-lg leading-snug text-text placeholder:text-muted focus:outline-none sm:text-xl"
        />
        {formError && (
          <p id="forgot-error" role="alert" className="px-1 pb-2 text-sm font-medium text-danger">
            {formError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="px-1 text-xs tabular-nums text-muted" aria-hidden="true">
            {text.length}/600
          </span>
          <button
            type="submit"
            disabled={state.status === "loading"}
            aria-busy={state.status === "loading"}
            className="min-h-12 rounded-xl bg-accent px-6 text-base font-bold text-accent-ink hover:brightness-110 active:translate-y-px disabled:cursor-progress disabled:opacity-70"
          >
            {state.status === "loading" ? "Searching…" : "Find the show"}
          </button>
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
