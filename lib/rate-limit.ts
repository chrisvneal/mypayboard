/**
 * In-memory sliding-window-ish rate limiter for server actions. Per-process
 * only (resets on redeploy/restart, not shared across instances) — fine at
 * this scale per the pre-launch audit; revisit with a shared store (Redis/
 * Upstash) if this ever runs multi-instance behind real traffic.
 *
 * Keys are always caller-controlled identifiers resolved server-side (Clerk
 * user id, household id) — never attacker-suppliable strings — so the bucket
 * map can't be grown unbounded by a single abusive caller.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number }

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now }
  }

  bucket.count += 1
  return { allowed: true }
}

export function formatRetryAfter(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000)
  if (minutes <= 1) return 'a minute'
  if (minutes < 60) return `${minutes} minutes`
  return `about an hour`
}
