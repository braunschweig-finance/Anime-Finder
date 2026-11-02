/**
 * The top of the home page: header and headline sitting on a slowly sliding
 * strip of this week's trending anime covers. Everything below it stays plain.
 *
 * The hero always uses the dark palette (data-theme="dark"), in light mode too,
 * so white text on the art reads the same either way.
 */
import { Suspense } from "react";
import { getBackdropCovers } from "@/lib/backdrop";
import { Headline } from "./Headline";
import { SiteHeader } from "./SiteHeader";

async function PosterStrip() {
  const covers = await getBackdropCovers();
  if (covers.length < 6) return null;
  // The strip is the list twice in a row; sliding it by exactly half loops seamlessly.
  const loop = [...covers, ...covers];
  return (
    <div className="hero-strip" aria-hidden="true">
      <div className="hero-track">
        {loop.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- decorative, straight from AniList's CDN
          <img key={i} src={src} alt="" width={230} height={330} decoding="async" loading={i < 6 ? "eager" : "lazy"} fetchPriority={i < 3 ? "high" : "low"} />
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <div data-theme="dark" className="hero text-text">
      <Suspense fallback={null}>
        <PosterStrip />
      </Suspense>
      <div className="hero-veil" aria-hidden="true" />
      <SiteHeader />
      <Headline />
    </div>
  );
}
