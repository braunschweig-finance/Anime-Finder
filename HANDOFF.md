# Anime Finder: handoff notes (updated 2026-11-01, thread "Build and test Anime Finder site")

Next.js 16.4.3 (cacheComponents on). Run `npm ci` first. The environment env_01PmjXPRpUQhggEtAYqikCjy
reaches graphql.anilist.co and generativelanguage.googleapis.com; skills.sh and github.com are blocked (403).

## Status
- `npx eslint`: clean. `npx tsc --noEmit`: clean. `npm run build`: succeeds (/ is partial prerender; about, privacy, sitemap, robots, OG image are static).
- All API routes were tested LIVE against AniList in fallback (no-Gemini) mode. Results are real and relevant.
- The Gemini path is NOT tested yet because there's no key. Jacob was asked (2026-11-01) to add the env var
  GEMINI_API_KEY under Project settings > Cloud environment. Only new sessions see it. Check with `env | grep -c GEMINI_API_KEY` and never print the value.

## Changes made in this thread
1. Lint fixes (set-state-in-effect): app/page.tsx now reads URL params on the server inside <Suspense> and passes
   `initial` props to Finder, FindTab and SimilarTab. ThemeToggle uses useSyncExternalStore. useRequest.run() returns data.
   SimilarTab keeps lastParams in a ref.
2. Build fix: removed `new Date()` from Filters, which was blocking prerender.
3. .gitignore: `.env.local` is ignored and `.env.example` is kept.
4. Autocomplete: AniList search only matches whole words, so "frie" returned nothing. lib/anilist.ts now keeps a daily
   index of the 250 most popular shows, prefix-matches against it first, then adds AniList's own results.
5. New lib/franchise.ts keeps one entry per franchise (Demon Slayer had appeared 4 times). It's used in Tab 1 (fallback and
   Gemini picks; the Gemini prompt also asks for one season per franchise), Tab 2 (prefers the first season) and Tab 3.
6. Tab 3 fallback: a show gets "High" when it matches 2+ remembered names, or a name plus a specific tag. Generic genres don't count.
   Shows that haven't been released yet are excluded from all tabs.

## Test results so far (fallback mode, curl against `next start`)
- Tab 1: anime like Frieren, anime like One Piece, sad elf fantasy, hype found-family, cozy slice of life, plus filters
  (finished TV, 30 eps or fewer, score 80+, 2015-2024; and movie + Romance). All good.
- Tab 2: Frieren, One Piece, Fire Force, Jujutsu Kaisen and Violet Evergarden all good. An unknown title gives a clear "couldn't find" message.
- Tab 3: name clues work well (Shinra gives Fire Force at High; Edward + Alphonse gives FMA at High; Tanjiro; Luffy). Clues that are only
  appearance ("girl with pink hair who fights demons with a sword") or only plot ("notebook that kills") come back weak or empty without Gemini, as expected.
- Playwright browser run on mobile: the Tab 1 search worked, no images were broken, and the URL updated.
  OPEN BUG: typing "frie" in Tab 2 didn't show the suggestion list within 15s, even though
  /api/autocomplete returns suggestions through curl. Look at SimilarTab's open/skipNextLookup logic first.

## Left to do
- Fix the autocomplete UI bug above, then finish the browser checks: mobile and desktop, dark/light plus reload, console errors,
  horizontal overflow, and error states (AniList down: set ANILIST_API_URL to a bad URL; Gemini off: no key).
- With the key: 5+ searches per tab in AI mode. Confirm there are no invented titles, the reasons read well, and caching works.
- Design, performance and UI-guideline passes from Jacob's newer request.
- Vercel launch steps and custom domain. Jacob said not to deploy yet.
- AniList API terms on commercial use (ads) still need checking before adding ads.

## Update from thread "Polish, test and prep Anime Finder" (2026-11-01)
Design (frontend-design): manga-panel search box (hard ink shadow + halftone corner, `.panel` in globals.css),
segmented tabs that fit on phones, result cards tinted by each show's AniList cover color (`.tinted`), outlined rank
numbers on AI picks, gold score sticker. Fixed: result cards overflowed sideways on phones (grid needed minmax(0,1fr)).
Performance (react-best-practices): identify.ts runs Gemini + character lookup in parallel; recommend.ts fetches
reference-show recs in parallel; headline word cycler is its own component (no longer re-renders all tabs);
filter re-search moved from an effect into the change handler; memoized ResultCard with a stable callback;
preconnect to s4.anilist.co.
UI guidelines: 2 review rounds. Kept on purpose: sentence case (not Title Case), Forgot-tab clues not in the URL.
New: "I've seen it" button on every card (components/useSeen.ts, localStorage only) hides seen shows, with Undo.
Forgot tab folds 4 less common fields behind "Add setting, time period…".
Keyword fallback: "villain" no longer maps to Villainess; added outlive/immortal, adults/office.
AniList-down message now says AniList isn't answering (not "check your connection").
Testing: tools in the thread's scratch (Playwright e2e, 50 checks across 390px and 1366px) all passed.
Note: our rate limiter keys on IP, so local test runs from one IP hit 12 searches/min quickly. Not an issue on Vercel.
Launch guide (Claude Doc): https://claude.ai/artifact/2UWWCfv8r6pSY21Sf33b8i
Follow-up fixes from the Gemini test thread (2026-11-01): default model is now gemini-flash-lite-latest (full Flash was
40–120 s and 20 req/day free); non-lite models get thinkingConfig {thinkingLevel:"low"} (GEMINI_THINKING_LEVEL).
429s honour RetryInfo.retryDelay (daily quota → hours), are logged, and show a "used up today's free limit" notice.
Fallback answers are cached 60 s (memory + CDN). Keyword fallback: demographic tags ("kids") and everyday-word tags
("food") are no longer matched directly; Tab 1 fallback keeps only shows in a named subject genre (Sports etc.);
Tab 3 keyword-only guesses need 2+ keyword hits. Autocomplete waits up to 3 s for the popular-titles index on a cold
start (before, "frie" returned nothing after a restart and the CDN cached that empty answer for a day).
