/**
 * Per-visitor rate limit for our own API routes.
 *
 * Gemini's free tier only allows a limited number of calls per minute for the
 * whole site. This stops one person (or a bot) from using all of it by
 * hammering the search button. It's in-memory, so it's "best effort" on
 * Vercel, which is fine for a free site.
 */
const hits = new Map<string, number[]>();

/** Returns true if this visitor may make another request right now. */
export function allowRequest(ip: string, limit = 15, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing forever.
  if (hits.size > 5000) hits.clear();
  return true;
}

/** Best guess at the visitor's IP address (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
