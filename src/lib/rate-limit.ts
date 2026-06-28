import { db } from './db'

// Purge stale rate limit records hourly so the table doesn't grow unbounded
setInterval(() => {
  const now = Math.floor(Date.now() / 1000)
  try {
    db.prepare('DELETE FROM rate_limits WHERE reset_at < ? AND (locked_until IS NULL OR locked_until < ?)').run(now, now)
  } catch {}
}, 3_600_000)

export type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string; retryAfter: number }

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Math.floor(Date.now() / 1000)
  const windowSecs = Math.ceil(windowMs / 1000)

  type Row = { count: number; reset_at: number; locked_until: number | null }
  const row = db.prepare('SELECT count, reset_at, locked_until FROM rate_limits WHERE key = ?').get(key) as Row | undefined

  if (row?.locked_until && now < row.locked_until) {
    return { ok: false, error: 'Too many attempts. Try again later.', retryAfter: row.locked_until - now }
  }

  if (!row || now >= row.reset_at) {
    db.prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at, locked_until) VALUES (?, 1, ?, NULL)').run(key, now + windowSecs)
    return { ok: true }
  }

  const newCount = row.count + 1
  db.prepare('UPDATE rate_limits SET count = ? WHERE key = ?').run(newCount, key)

  if (newCount > max) {
    return { ok: false, error: 'Too many requests. Please slow down.', retryAfter: row.reset_at - now }
  }
  return { ok: true }
}

// Progressive lockout: 5 fails → 5 min · 10 fails → 30 min · 15+ → 24 h
export function recordFailedAuth(ip: string, email: string): { locked: boolean; lockSeconds: number } {
  const key = `auth_fail:${ip}:${email}`
  const now = Math.floor(Date.now() / 1000)

  type Row = { count: number; reset_at: number; locked_until: number | null }
  const row = db.prepare('SELECT count, reset_at, locked_until FROM rate_limits WHERE key = ?').get(key) as Row | undefined

  if (row?.locked_until && now < row.locked_until) {
    return { locked: true, lockSeconds: row.locked_until - now }
  }

  const count = (row?.count ?? 0) + 1
  let lockUntil: number | null = null
  if (count >= 15) lockUntil = now + 86_400
  else if (count >= 10) lockUntil = now + 1_800
  else if (count >= 5) lockUntil = now + 300

  const resetAt = Math.max(row?.reset_at ?? 0, now + 3_600)
  db.prepare('INSERT OR REPLACE INTO rate_limits (key, count, reset_at, locked_until) VALUES (?, ?, ?, ?)').run(key, count, resetAt, lockUntil)

  return { locked: lockUntil !== null, lockSeconds: lockUntil ? lockUntil - now : 0 }
}

export function clearFailedAuth(ip: string, email: string) {
  db.prepare('DELETE FROM rate_limits WHERE key = ?').run(`auth_fail:${ip}:${email}`)
}

export function checkAuthLock(ip: string, email: string): { locked: boolean; lockSeconds: number } {
  const key = `auth_fail:${ip}:${email}`
  const now = Math.floor(Date.now() / 1000)
  const row = db.prepare('SELECT locked_until FROM rate_limits WHERE key = ?').get(key) as { locked_until: number | null } | undefined
  if (row?.locked_until && now < row.locked_until) {
    return { locked: true, lockSeconds: row.locked_until - now }
  }
  return { locked: false, lockSeconds: 0 }
}
