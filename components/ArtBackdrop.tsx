/**
 * The wall of anime posters behind the page: this week's trending covers from
 * AniList, tilted and faded under a veil so text on top stays readable.
 *
 * It's purely decorative (aria-hidden), sits in a fixed layer that never
 * scrolls or animates, and uses AniList's smallest cover size, so it adds
 * little weight. Phones get fewer tiles than desktops (see .art-wall in globals.css).
 */
import { getBackdropCovers } from "@/lib/backdrop";

export async function ArtBackdrop() {
  const covers = await getBackdropCovers();
  if (covers.length < 6) return null;
  // Repeat the list so the tilted grid always fills the screen edge to edge.
  const tiles = Array.from({ length: 240 }, (_, i) => covers[i % covers.length]);
  return (
    <div className="art-backdrop" aria-hidden="true">
      <div className="art-wall">
        {tiles.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- decorative, straight from AniList's CDN
          <img key={i} src={src} alt="" width={100} height={142} decoding="async" fetchPriority="low" />
        ))}
      </div>
      <div className="art-veil" />
    </div>
  );
}
