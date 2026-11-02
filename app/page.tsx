/**
 * Home page: the headline and the three search tabs (see components/Finder.tsx).
 *
 * Shared links like /?q=cozy+fantasy or /?tab=similar&id=154587 open straight
 * into results. We read those URL parameters here on the server and hand them
 * to the tabs, so the tabs don't have to dig them out of the address bar.
 */
import { Suspense } from "react";
import { Finder, type FinderInitial } from "@/components/Finder";
import { Hero } from "@/components/Hero";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Structured data helps Google show the site name and a search box in results.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

type Params = Record<string, string | string[] | undefined>;

/** Read the URL parameters (only known ones, as plain strings). */
async function FinderFromUrl({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const initial: FinderInitial = {
    tab: one("tab") === "similar" ? "similar" : one("tab") === "forgot" ? "forgot" : "find",
    q: one("q").slice(0, 300),
    filters: { genre: one("genre"), format: one("format"), epMin: one("epMin"), epMax: one("epMax") },
    similarId: one("id"),
    similarTitle: one("title").slice(0, 80),
  };
  return <Finder initial={initial} />;
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero />
      {/* The fallback is the same page with empty boxes; it's what search engines and first paint see. */}
      <Suspense fallback={<Finder initial={{ tab: "find" }} />}>
        <FinderFromUrl searchParams={searchParams as Promise<Params>} />
      </Suspense>
    </>
  );
}
