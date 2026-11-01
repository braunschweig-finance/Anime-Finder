/**
 * Calls to Google's Gemini AI. SERVER-SIDE ONLY.
 *
 * The API key is read from the GEMINI_API_KEY environment variable, which is
 * only available to code running on the server (API routes). It is never sent
 * to the browser. Locally it comes from `.env.local`; on Vercel it comes from
 * Project Settings → Environment Variables.
 *
 * We ask Gemini to reply in strict JSON (using a "response schema") so we can
 * read its answer reliably.
 */
import "server-only";

/** Thrown when Gemini is missing, rate-limited, or misbehaving. Callers fall back to plain search. */
export class GeminiUnavailable extends Error {
  constructor(
    message: string,
    public readonly reason: "no-key" | "rate-limited" | "error",
  ) {
    super(message);
    this.name = "GeminiUnavailable";
  }
}

// "gemini-flash-lite-latest" is Google's newest Flash-Lite model. Tested Nov 2026: it answers in
// 1–2 s with good picks, while the full "gemini-flash-latest" took 40–120 s or returned "high
// demand" errors, and its free tier allows only 20 requests a day. Pin another model with
// GEMINI_MODEL in .env.local (or Vercel) if you prefer.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
// Bigger "thinking" Flash models are much faster with low thinking (17–22 s → 5–10 s).
// Lite models don't need it, so it's only sent for non-lite models.
const THINKING = MODEL.includes("lite") ? undefined : { thinkingLevel: process.env.GEMINI_THINKING_LEVEL || "low" };
const BASE = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta";

/** If Gemini rate-limits us, skip it entirely for a short while instead of retrying every search. */
let pausedUntil = 0;

/** True when Gemini is paused for more than a few minutes (e.g. the free daily limit is used up). */
export function geminiPausedLong(): boolean {
  return pausedUntil - Date.now() > 5 * 60 * 1000;
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Ask Gemini a question and get back JSON matching `schema`.
 * @param prompt  The instructions + data.
 * @param schema  Gemini "responseSchema" describing the JSON we expect.
 */
export async function askGeminiJSON<T>(prompt: string, schema: object, timeoutMs = 15_000): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiUnavailable("No Gemini key set", "no-key");
  if (Date.now() < pausedUntil) throw new GeminiUnavailable("Gemini paused after rate limit", "rate-limited");

  let res: Response;
  try {
    res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          responseSchema: schema,
          ...(THINKING ? { thinkingConfig: THINKING } : {}),
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[gemini] network error or timeout:", err);
    throw new GeminiUnavailable("Gemini didn't answer in time", "error");
  }

  if (res.status === 429) {
    // Google says how long to wait (RetryInfo.retryDelay, e.g. "38s" for the per-minute limit or
    // hours for the daily one). Skip Gemini until then; default to 60 s if it doesn't say.
    const detail = await res.text().catch(() => "");
    const delay = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(detail);
    const waitS = delay ? Math.ceil(Number(delay[1])) : 60;
    const quota = /"quotaId"\s*:\s*"([^"]+)"/.exec(detail)?.[1] ?? "unknown quota";
    pausedUntil = Date.now() + waitS * 1000;
    console.warn(`[gemini] 429 rate limit (${quota}); skipping Gemini for ${waitS}s`);
    throw new GeminiUnavailable("Gemini rate limit reached", "rate-limited");
  }
  if (!res.ok) {
    // Log the status only. Never log the request (it contains the key in a header).
    console.error("[gemini] HTTP", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new GeminiUnavailable(`Gemini returned HTTP ${res.status}`, "error");
  }

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("[gemini] unreadable JSON:", text.slice(0, 300));
    throw new GeminiUnavailable("Gemini sent an unreadable answer", "error");
  }
}

/** Wrap user text so Gemini treats it as data, not instructions. */
export function quoteUserText(text: string): string {
  return `<<<\n${text.replace(/<<<|>>>/g, "").slice(0, 1200)}\n>>>`;
}
