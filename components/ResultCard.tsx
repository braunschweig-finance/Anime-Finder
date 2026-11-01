/**
 * One anime result. Used by all three tabs; each tab fills in a different
 * "why" section (reason, shared tags, or confidence + matched clues).
 *
 * Layout: on phones the cover and title sit side by side and everything else
 * runs full width underneath, so long text gets the whole screen. From the
 * `sm` breakpoint up, the cover becomes a column on the left.
 * Each card is tinted with the show's own cover color from AniList.
 */
"use client";
import { memo, useState } from "react";
import { episodesLabel, FORMAT_LABEL, STATUS_LABEL } from "@/lib/format";
import { watchLink } from "@/lib/links";
import type { AnimeResult } from "@/lib/types";

const CONFIDENCE_STYLE = {
  High: "bg-sakura text-sakura-ink",
  Medium: "bg-sky/20 text-sky",
  Low: "bg-surface-2 text-muted",
} as const;

interface Props {
  anime: AnimeResult;
  rank?: number;
  /** The first two cards load their covers right away; the rest wait until scrolled near. */
  eager?: boolean;
  seen: boolean;
  onToggleSeen: (anime: AnimeResult) => void;
  /** Label for the shared genres/tags line: "Shares" on If you liked…, "Matches" on Find. */
  sharedLabel?: string;
}

export const ResultCard = memo(function ResultCard({ anime, rank, eager = false, seen, onToggleSeen, sharedLabel = "Shares" }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const facts = [
    anime.format ? FORMAT_LABEL[anime.format] ?? anime.format : null,
    episodesLabel(anime.episodes, anime.format),
    anime.year ? String(anime.year) : null,
    anime.status ? STATUS_LABEL[anime.status] ?? anime.status : null,
  ].filter(Boolean) as string[];
  const headingId = `anime-${anime.id}`;
  const watch = anime.streaming[0];
  const link = watch ? watchLink(watch.site, watch.url) : null;
  const subtitle = [anime.native, anime.romaji !== anime.title ? anime.romaji : null].filter(Boolean).join(" / ");

  return (
    <article
      aria-labelledby={headingId}
      className={`tinted grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-2xl border border-line p-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4 sm:p-4 ${seen ? "opacity-60" : ""}`}
      style={{ "--tint": anime.coverColor ?? undefined } as React.CSSProperties}
    >
      {/* Cover art. The AniList cover color shows while it loads. */}
      <div className="relative self-start sm:row-span-2">
        <a
          href={anime.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl"
          style={{ backgroundColor: anime.coverColor ?? "var(--surface-2)", aspectRatio: "23 / 33" }}
          tabIndex={-1}
          aria-hidden="true"
        >
          {anime.coverImage && !imgFailed ? (
            // A plain <img> loads straight from AniList's image CDN (fast, and free on Vercel).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anime.coverImage}
              alt=""
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              decoding="async"
              width={230}
              height={330}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center p-2 text-center font-display text-xs text-text/80">
              {anime.title}
            </span>
          )}
        </a>
        {rank != null && (
          <span className="rank pointer-events-none absolute -left-2 -top-3 text-4xl leading-none sm:text-5xl" aria-hidden="true">
            {rank}
          </span>
        )}
        {anime.score != null && (
          <span
            className="absolute -bottom-2 right-1.5 rounded-md border-2 border-[#17152e] bg-[#ffd23f] px-1.5 text-xs font-bold tabular-nums text-[#17152e]"
            aria-hidden="true"
          >
            ★&nbsp;{anime.score}%
          </span>
        )}
      </div>

      <header className="min-w-0">
        <h3 id={headingId} className="break-words text-base font-bold leading-snug sm:text-lg">
          {rank != null && <span className="sr-only">{rank}. </span>}
          {anime.title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted" lang="ja" translate="no">
            {subtitle}
          </p>
        )}
        {anime.confidence && (
          <p className="mt-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CONFIDENCE_STYLE[anime.confidence]}`}>
              {anime.confidence} match
            </span>
          </p>
        )}
        <ul className="mt-2 flex flex-wrap gap-1.5 text-xs" aria-label="Details">
          {anime.score != null && <li className="sr-only">Score {anime.score} out of 100</li>}
          {facts.map((f) => (
            <li key={f} className="rounded-md bg-surface-2 px-2 py-0.5 tabular-nums text-text">
              {f}
            </li>
          ))}
        </ul>
      </header>

      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2">
        {anime.reason && (
          <p className="border-l-4 border-sakura pl-3 text-[0.9375rem] leading-relaxed">
            <span className="sr-only">Why you&apos;ll like it: </span>
            {anime.reason}
          </p>
        )}
        {anime.shared && anime.shared.length > 0 && (
          <p className="text-sm leading-relaxed">
            <span className="font-bold text-sakura">{sharedLabel}: </span>
            {anime.shared.join(", ")}
          </p>
        )}
        {anime.matchedClues && anime.matchedClues.length > 0 && (
          <p className="mt-1 text-sm leading-relaxed">
            <span className="font-bold text-sakura">Matches your clues: </span>
            {anime.matchedClues.join("; ")}
          </p>
        )}
        {anime.genres.length > 0 && !anime.shared?.length && (
          <p className="mt-2 text-xs text-muted">{anime.genres.slice(0, 5).join(", ")}</p>
        )}
        {anime.description && (
          <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-muted">{anime.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          {link && watch ? (
            <a
              href={link.href}
              target="_blank"
              rel={`noopener noreferrer${link.sponsored ? " sponsored" : ""}`}
              className="inline-flex min-h-10 items-center rounded-full bg-sakura px-4 text-sm font-bold text-sakura-ink hover:brightness-110"
            >
              Watch on {watch.site}
              <span className="sr-only">: {anime.title}</span>
            </a>
          ) : null}
          <a
            href={anime.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-medium text-sky hover:border-sky"
          >
            AniList page
            <span className="sr-only">: {anime.title}</span>
          </a>
          <button
            type="button"
            aria-pressed={seen}
            aria-label={`I've seen it: ${anime.title}`}
            onClick={() => onToggleSeen(anime)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-surface-2 hover:text-text ${seen ? "text-sakura" : "text-muted"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
              {seen ? <path d="M5 12l5 5 9-10" /> : <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>}
            </svg>
            I&apos;ve seen it
          </button>
        </div>
      </div>
    </article>
  );
});
