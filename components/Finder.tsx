"use client";
/**
 * The home page's interactive part: the headline and the three tabs.
 * Tabs follow the WAI-ARIA "tabs" pattern (arrow keys switch tabs).
 * All three tab panels stay mounted, so switching tabs keeps your results.
 */
import { useEffect, useRef, useState } from "react";
import { AD_SLOTS_VISIBLE, AdSlot } from "./AdSlot";
import { FindTab } from "./FindTab";
import { ForgotTab } from "./ForgotTab";
import { SimilarTab } from "./SimilarTab";

const TABS = [
  { id: "find", label: "Find my next anime" },
  { id: "similar", label: "If you liked…" },
  { id: "forgot", label: "Forgot the name?" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** What the page's URL asked for, e.g. /?q=cozy+fantasy or /?tab=similar&id=154587. */
export interface FinderInitial {
  tab: TabId;
  q?: string;
  filters?: Record<string, string | undefined>;
  similarId?: string;
  similarTitle?: string;
}

/** Words that cycle through the headline blank. */
const BLANKS = ["Frieren", "One Piece", "Fire Force", "sad elves", "found family", "giant robots"];

/**
 * The cycling word in the headline. It lives in its own small component so
 * that changing the word every few seconds only re-renders this <span>, not
 * the three search tabs and their results.
 */
function CyclingBlank() {
  const [blank, setBlank] = useState(0);
  // Cycle the word every 2.6s, unless the visitor prefers reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setBlank((b) => (b + 1) % BLANKS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span aria-hidden="true">
      <span key={blank} className="blank">{BLANKS[blank]}</span>?
    </span>
  );
}

export function Finder({ initial }: { initial: FinderInitial }) {
  const [tab, setTab] = useState<TabId>(initial.tab);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(id: TabId, focus = false) {
    setTab(id);
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== id) {
      // Switching tabs starts a clean URL for that tab.
      window.history.replaceState(null, "", id === "find" ? "/" : `/?tab=${id}`);
    }
    if (focus) tabRefs.current[TABS.findIndex((t) => t.id === id)]?.focus();
  }

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const next =
      e.key === "ArrowRight" ? (i + 1) % TABS.length
      : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : -1;
    if (next >= 0) {
      e.preventDefault();
      select(TABS[next].id, true);
    }
  }

  return (
    <div className={`mx-auto w-full max-w-2xl px-4 sm:px-6 ${AD_SLOTS_VISIBLE ? "lg:max-w-5xl" : ""}`}>
      <section className="pb-5 pt-6 sm:pb-6 sm:pt-10">
        <h1 className="font-display text-[1.875rem] leading-[1.12] sm:text-[2.625rem]">
          What anime should I watch if I like{" "}
          <span className="sr-only">___?</span>
          <CyclingBlank />
        </h1>
        <p className="mt-3 text-pretty text-[0.9375rem] text-muted sm:text-base">
          Describe a vibe, name a show you loved, or list the few details you remember. Every pick is a real show from
          the AniList database.
        </p>
      </section>

      {/* Tabs: three equal columns at every width, so they line up with the search box. */}
      <div
        role="tablist"
        aria-label="Ways to search"
        className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-surface p-1.5"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`min-h-12 rounded-xl px-2 py-1.5 text-[0.8125rem] font-bold leading-tight sm:px-3 sm:text-[0.9375rem] ${
              tab === t.id
                ? "bg-accent text-accent-ink"
                : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-8 py-5">
        <div className="min-w-0 flex-1">
          {TABS.map((t) => (
            <section
              key={t.id}
              id={`panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              hidden={tab !== t.id}
              tabIndex={0}
              className="rounded-2xl"
            >
              {t.id === "find" && (
                <FindTab initialQuery={initial.tab === "find" ? initial.q : undefined} initialFilters={initial.filters} />
              )}
              {t.id === "similar" && (
                <SimilarTab
                  initialId={initial.tab === "similar" ? initial.similarId : undefined}
                  initialTitle={initial.tab === "similar" ? initial.similarTitle : undefined}
                />
              )}
              {t.id === "forgot" && <ForgotTab />}
            </section>
          ))}
        </div>
        {AD_SLOTS_VISIBLE && (
          <div className="hidden w-[300px] shrink-0 lg:block">
            <div className="sticky top-6">
              <AdSlot variant="sidebar" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
