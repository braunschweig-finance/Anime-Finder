/** Site-wide settings. Change the name or tagline here and it updates everywhere. */
export const SITE_NAME = "Anime Finder";
export const SITE_TAGLINE = "What anime should I watch if I like ___?";
export const SITE_DESCRIPTION =
  "Free anime recommendations. Describe the show you want, find anime like your favorite, or identify an anime you forgot the name of. Every pick is a real show from AniList.";

/**
 * The site's public address, used for the sitemap and share previews.
 * Set NEXT_PUBLIC_SITE_URL once you have a custom domain (e.g. https://animefinder.gg).
 * On Vercel it falls back to your free *.vercel.app address automatically.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/** Shown on the privacy page. Set NEXT_PUBLIC_CONTACT_EMAIL in Vercel (or .env.local). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
