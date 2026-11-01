/**
 * GET /api/search?q=...&genre=...&format=...  (Tab 1: "Find my next anime")
 * Runs on the server, so it can safely use the Gemini key.
 */
import { errorResponse, json, parseFilters, tooMany } from "@/lib/http";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { findAnime } from "@/lib/recommend";

export const maxDuration = 30; // seconds; two Gemini calls + AniList can take a while

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 300);
  if (q.length < 2) return json({ error: "Describe what you're in the mood for, for example \"a cozy fantasy with a found family\"." }, 400);
  if (!allowRequest(clientIp(req), 12)) return tooMany();
  try {
    const res = await findAnime(q, parseFilters(params));
    // Let the CDN reuse good answers for a day; fallback answers only briefly.
    return json(res, 200, res.mode === "ai" ? 86_400 : 60);
  } catch (err) {
    return errorResponse(err);
  }
}
