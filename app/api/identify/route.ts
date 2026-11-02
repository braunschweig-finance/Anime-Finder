/** POST /api/identify  { description } (or the older per-field clues: appearance, plot, ...)  → guesses for "Forgot the name?" (Tab 3). */
import { errorResponse, json, tooMany } from "@/lib/http";
import { identifyAnime } from "@/lib/identify";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import type { IdentifyClues } from "@/lib/types";

export const maxDuration = 30;

const FIELDS: (keyof IdentifyClues)[] = [
  "description", "appearance", "characterNames", "plot", "setting", "timePeriod", "artStyle", "whenWatched", "other",
];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "That request didn't look right. Refresh the page and try again." }, 400);
  }
  // Keep only known fields, as short strings.
  const clues: IdentifyClues = {};
  for (const f of FIELDS) {
    const v = typeof body[f] === "string" ? (body[f] as string).trim().slice(0, f === "description" ? 600 : 400) : "";
    if (v) clues[f] = v;
  }
  const total = Object.values(clues).join(" ").length;
  if (total < 3) return json({ error: "Add at least one detail you remember, like a character's look or a plot moment." }, 400);
  if (!allowRequest(clientIp(req), 12)) return tooMany();
  try {
    return json(await identifyAnime(clues));
  } catch (err) {
    return errorResponse(err);
  }
}
