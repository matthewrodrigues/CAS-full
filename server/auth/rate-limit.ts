/**
 * At most `max` hits per key in any `windowMs`, in memory (fine with one server instance).
 * Keys that stop hitting are pruned, so memory doesn't grow with every client ever seen.
 */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, number[]>()
  let calls = 0

  function prune(now: number) {
    for (const [key, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(key)
  }

  return {
    attempt(key: string): { ok: true } | { ok: false; retryAfterS: number } {
      const now = Date.now()
      if (++calls % 100 === 0 || hits.size > 1000) prune(now)
      const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs)
      if (recent.length >= max) {
        hits.set(key, recent)
        return { ok: false, retryAfterS: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) }
      }
      recent.push(now)
      hits.set(key, recent)
      return { ok: true }
    },
    size: () => hits.size,
  }
}
