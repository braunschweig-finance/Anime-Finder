/**
 * A tiny in-memory cache with an expiry time.
 *
 * Why: AniList and Gemini both limit how often we may call them. If someone
 * searches "anime like Frieren" and then a minute later someone else does too,
 * we answer the second one from memory instead of calling the APIs again.
 *
 * Limitation: on Vercel, memory lives inside one running server instance, so
 * the cache resets when that instance goes to sleep. The API routes also send
 * `Cache-Control` headers so Vercel's CDN keeps a shared copy of GET results,
 * which survives across instances.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private store = new Map<string, Entry<T>>();

  constructor(
    /** How many entries to keep before dropping the oldest. */
    private maxEntries: number,
    /** How long an entry stays fresh, in milliseconds. */
    private ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Re-insert so this key counts as "recently used" (Map keeps insertion order).
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key: string, value: T, ttlMs = this.ttlMs): void {
    this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    // Drop the least recently used entries when we're over the limit.
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }
}

/**
 * Run `work` only if `key` isn't cached yet. If two identical requests arrive
 * at the same moment, they share one call instead of making two.
 */
const inFlight = new Map<string, Promise<unknown>>();
export async function cached<T>(
  cache: TTLCache<T>,
  key: string,
  work: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const p = work()
    .then((value) => {
      cache.set(key, value, ttlMs);
      return value;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}
