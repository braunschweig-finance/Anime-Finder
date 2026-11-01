/** GET /api/autocomplete?q=frie  → title suggestions for Tab 2. */
import { autocomplete } from "@/lib/anilist";
import { errorResponse, json, tooMany } from "@/lib/http";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return json({ suggestions: [] });
  if (!allowRequest(`ac:${clientIp(req)}`, 60)) return tooMany();
  try {
    const suggestions = await autocomplete(q);
    // Keep good answers on the CDN for a day; an empty one only briefly, in case AniList was slow.
    return json({ suggestions }, 200, suggestions.length ? 86_400 : 60);
  } catch (err) {
    return errorResponse(err);
  }
}
