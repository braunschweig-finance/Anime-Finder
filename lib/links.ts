/**
 * Outgoing "Where to watch" links.
 *
 * MONEY NOTE: when you join an affiliate program (for example Crunchyroll's,
 * via Impact), add your tracking here so every "Watch on…" button earns
 * credit. Links get rel="sponsored" automatically once a tag is added.
 */
export function watchLink(site: string, url: string): { href: string; sponsored: boolean } {
  // Example once you have an affiliate URL format:
  // if (site === "Crunchyroll") return { href: `https://your-affiliate-link?u=${encodeURIComponent(url)}`, sponsored: true };
  void site;
  return { href: url, sponsored: false };
}
