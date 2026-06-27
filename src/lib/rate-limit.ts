/**
 * In-memory rate limiter.
 * For multi-server deployments, replace with Redis-backed solution.
 */

type Entry = { count: number; resetAt: number; lockedUntil?: number }
const store = new Map<string, Entry>()

// Clean up stale entries every 10 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store) {
    if (now > v.resetAt && (!v.lockedUntil || now > v.lockedUntil)) store.delete(k)
  }
}, 600_000)

export type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string; retryAfter: number }

/**
 * Check a rate limit. Returns ok:false if limit exceeded.
 * @param key      - unique key (e.g. "login:127.0.0.1")
 * @param max      - max requests in window
 * @param windowMs - window in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  // Check hard lock (e.g. after too many violations)
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { ok: false, error: 'Too many attempts. Try again later.', retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) }
  }

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  entry.count++
  if (entry.count > max) {
    return { ok: false, error: 'Too many requests. Please slow down.', retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { ok: true }
}

/**
 * Track failed auth attempts with progressive lockout.
 * 5 failures → 5 min lock. 10 failures → 30 min lock. 15+ → 24h lock.
 */
export function recordFailedAuth(ip: string, email: string): { locked: boolean; lockSeconds: number } {
  const key = `auth_fail:${ip}:${email}`
  const now = Date.now()
  const entry = store.get(key) ?? { count: 0, resetAt: now + 3_600_000 }

  // Already hard-locked?
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { locked: true, lockSeconds: Math.ceil((entry.lockedUntil - now) / 1000) }
  }

  entry.count++
  let lockMs = 0
  if (entry.count >= 15) lockMs = 86_400_000      // 24 hours
  else if (entry.count >= 10) lockMs = 1_800_000  // 30 minutes
  else if (entry.count >= 5) lockMs = 300_000     // 5 minutes

  if (lockMs > 0) {
    entry.lockedUntil = now + lockMs
  }

  store.set(key, { ...entry, resetAt: Math.max(entry.resetAt, now + 3_600_000) })
  return { locked: lockMs > 0, lockSeconds: Math.ceil(lockMs / 1000) }
}

export function clearFailedAuth(ip: string, email: string) {
  store.delete(`auth_fail:${ip}:${email}`)
}

export function checkAuthLock(ip: string, email: string): { locked: boolean; lockSeconds: number } {
  const key = `auth_fail:${ip}:${email}`
  const entry = store.get(key)
  if (entry?.lockedUntil && Date.now() < entry.lockedUntil) {
    return { locked: true, lockSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) }
  }
  return { locked: false, lockSeconds: 0 }
}
