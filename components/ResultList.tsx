"use client";
/**
 * Renders the results grid, inserting an empty mobile ad slot after every 4th result.
 * (On desktop the ad lives in the sidebar instead; see AdSlot.)
 *
 * Shows you've marked "I've seen it" are hidden, with a button to show them
 * again and an Undo right after you mark one.
 */
import { Fragment, useCallback, useState } from "react";
import type { AnimeResult } from "@/lib/types";
import { AD_SLOTS_VISIBLE, AdSlot } from "./AdSlot";
import { ResultCard } from "./ResultCard";
import { toggleSeen, useSeen } from "./useSeen";

interface Props {
  results: AnimeResult[];
  numbered?: boolean;
  sharedLabel?: string;
}

export function ResultList({ results, numbered = false, sharedLabel }: Props) {
  const seen = useSeen();
  const [showSeen, setShowSeen] = useState(false);
  const [justHidden, setJustHidden] = useState<AnimeResult | null>(null);

  // Stable across renders, so marking one card doesn't re-render all the others.
  const onToggleSeen = useCallback((a: AnimeResult) => {
    setJustHidden(toggleSeen(a.id) ? a : null);
  }, []);

  const hiddenCount = showSeen ? 0 : results.filter((a) => seen.has(a.id)).length;
  const visible = showSeen ? results : results.filter((a) => !seen.has(a.id));

  return (
    <>
      <div aria-live="polite" className="empty:hidden mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        {justHidden && !showSeen && (
          <span>
            Hid “{justHidden.title}” because you&apos;ve seen it.{" "}
            <button
              type="button"
              className="min-h-10 font-bold text-sky underline underline-offset-4 hover:text-text"
              onClick={() => { toggleSeen(justHidden.id); setJustHidden(null); }}
            >
              Undo
            </button>
          </span>
        )}
        {hiddenCount > 0 && !justHidden && (
          <span>
            {hiddenCount === 1 ? "1 show you've seen is hidden." : `${hiddenCount} shows you've seen are hidden.`}{" "}
            <button
              type="button"
              className="min-h-10 font-bold text-sky underline underline-offset-4 hover:text-text"
              onClick={() => setShowSeen(true)}
            >
              Show them
            </button>
          </span>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
          You&apos;ve seen every show in these results. Try another search, or{" "}
          <button type="button" className="font-bold text-sky underline underline-offset-4" onClick={() => setShowSeen(true)}>
            show them anyway
          </button>
          .
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-5 xl:grid-cols-2" aria-label="Results">
          {visible.map((a, i) => (
            <Fragment key={a.id}>
              <li className="min-w-0">
                <ResultCard
                  anime={a}
                  rank={numbered ? results.indexOf(a) + 1 : undefined}
                  eager={i < 2}
                  seen={seen.has(a.id)}
                  onToggleSeen={onToggleSeen}
                  sharedLabel={sharedLabel}
                />
              </li>
              {AD_SLOTS_VISIBLE && (i + 1) % 4 === 0 && i < visible.length - 1 && (
                <li className="min-w-0 lg:hidden">
                  <AdSlot variant="inline" />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
      )}
    </>
  );
}
