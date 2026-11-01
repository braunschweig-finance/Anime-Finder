/**
 * GET /api/similar?id=154587      → shows similar to one AniList anime (Tab 2)
 * GET /api/similar?title=frieren  → same, using AniList's best title match
 */
import { autocomplete } from "@/lib/anilist";
import { errorResponse, json, tooMany } from "@/lib/http";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { findSimilar } from "@/lib/similar";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  let id = Number.parseInt(params.get("id") ?? "", 10);
  const title = (params.get("title") ?? "").trim().slice(0, 80);
  if (!(Number.isInteger(id) && id > 0) && title.length < 2) {
    return json({ error: "Type a show's name and pick it from the list." }, 400);
  }
  if (!allowRequest(`sim:${clientIp(req)}`, 30)) return tooMany();
  try {
    if (!(Number.isInteger(id) && id > 0)) {
      const best = (await autocomplete(title))[0];
      if (!best) return json({ error: `We couldn't find "${title}" on AniList. Check the spelling.` }, 404);
      id = best.id;
    }
    const res = await findSimilar(id);
    if (!res) return json({ error: "We couldn't find that show on AniList." }, 404);
    return json(res, 200, 86_400);
  } catch (err) {
    return errorResponse(err);
  }
}
