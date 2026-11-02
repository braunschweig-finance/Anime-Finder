/** The preview image shown when the site is shared on social media (1200×630). */
import { ImageResponse } from "next/og";

export const alt = "Anime Finder: What anime should I watch if I like ___?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(900px 400px at 50% 0%, #3a2418, #16141c)",
          color: "#f4f2f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#ff7a1a", fontWeight: 700 }}>Anime Finder</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 24, display: "flex", flexWrap: "wrap" }}>
          <span>What anime should I watch if I like&nbsp;</span>
          <span style={{ color: "#ff7a1a", borderBottom: "8px solid #ff7a1a" }}>Frieren</span>
          <span>?</span>
        </div>
        <div style={{ fontSize: 30, color: "#a9a5b8", marginTop: 36 }}>
          Describe a vibe, find shows like your favorite, or name that anime you forgot.
        </div>
      </div>
    ),
    size,
  );
}
