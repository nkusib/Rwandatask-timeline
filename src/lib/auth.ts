import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'
import { nanoid } from 'nanoid'
import crypto from 'crypto'
import type { User } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'remitflow-secret-change-in-production-min-32-chars'
)

export const COOKIE_NAME = 'rf_session'
const SESSION_TTL = 60 * 60 * 24 // 24 hours in seconds

// ─── Token helpers ─────────────────────────────────────────────────────────────

export async function createToken(userId: string, role: string, sessionId?: string): Promise<string> {
  return new SignJWT({ sub: userId, role, ...(sessionId ? { sid: sessionId } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string; role: string; sessionId?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub) return null
    return {
      userId: payload.sub as string,
      role: (payload.role as string) || 'user',
      sessionId: payload.sid as string | undefined,
    }
  } catch {
    return null
  }
}

// ─── Device fingerprinting ─────────────────────────────────────────────────────

export function computeDeviceFingerprint(ip: string, userAgent: string): string {
  // Use /24 subnet so DHCP lease changes don't break the fingerprint
  const subnet = ip.split('.').slice(0, 3).join('.') + '.0'
  return crypto.createHash('sha256').update(`${subnet}|${userAgent}`).digest('hex').slice(0, 32)
}

// ─── Session lifecycle ─────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  role: string,
  ip: string,
  userAgent: string
): Promise<string> {
  const sessionId = nanoid(24)
  const fingerprint = computeDeviceFingerprint(ip, userAgent)
  const now = Math.floor(Date.now() / 1000)

  db.prepare(`
    INSERT INTO user_sessions (id, user_id, session_id, device_fingerprint, user_agent, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nanoid(), userId, sessionId, fingerprint, userAgent.slice(0, 255), ip, now + SESSION_TTL)

  // Track device — upsert on fingerprint
  const existing = db.prepare('SELECT id FROM trusted_devices WHERE user_id = ? AND fingerprint_hash = ?').get(userId, fingerprint) as { id: string } | undefined
  if (!existing) {
    db.prepare(`
      INSERT OR IGNORE INTO trusted_devices (id, user_id, fingerprint_hash, user_agent, is_new)
      VALUES (?, ?, ?, ?, 1)
    `).run(nanoid(), userId, fingerprint, userAgent.slice(0, 255))
  } else {
    db.prepare('UPDATE trusted_devices SET last_seen_at = unixepoch(), is_new = 0 WHERE id = ?').run(existing.id)
  }

  return createToken(userId, role, sessionId)
}

export function revokeSession(sessionId: string): void {
  db.prepare('UPDATE user_sessions SET revoked_at = unixepoch() WHERE session_id = ?').run(sessionId)
}

export function revokeAllSessions(userId: string): void {
  db.prepare('UPDATE user_sessions SET revoked_at = unixepoch() WHERE user_id = ? AND revoked_at IS NULL').run(userId)
}

export function listActiveSessions(userId: string) {
  return db.prepare(`
    SELECT session_id, user_agent, ip_address, created_at, last_active_at, is_new
    FROM user_sessions
    LEFT JOIN trusted_devices ON user_sessions.device_fingerprint = trusted_devices.fingerprint_hash
      AND trusted_devices.user_id = user_sessions.user_id
    WHERE user_sessions.user_id = ? AND user_sessions.revoked_at IS NULL AND user_sessions.expires_at > unixepoch()
    ORDER BY user_sessions.last_active_at DESC
  `).all(userId) as Array<{
    session_id: string
    user_agent: string | null
    ip_address: string | null
    created_at: number
    last_active_at: number
    is_new: number | null
  }>
}

// ─── getSession / requireAuth ──────────────────────────────────────────────────

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const verified = await verifyToken(token)
    if (!verified) return null

    // Validate session against DB (enables revocation)
    if (verified.sessionId) {
      type SessRow = { revoked_at: number | null; last_active_at: number }
      const sess = db.prepare(
        'SELECT revoked_at, last_active_at FROM user_sessions WHERE session_id = ? AND user_id = ? AND expires_at > unixepoch()'
      ).get(verified.sessionId, verified.userId) as SessRow | undefined

      if (!sess || sess.revoked_at !== null) return null

      // Throttle last_active_at updates to every 5 minutes
      if (Math.floor(Date.now() / 1000) - sess.last_active_at > 300) {
        db.prepare('UPDATE user_sessions SET last_active_at = unixepoch() WHERE session_id = ?').run(verified.sessionId)
      }
    }

    const user = db.prepare(
      `SELECT id, email, name, phone, country, plan, kyc_status, kyc_level,
              date_of_birth, address, nationality, role, is_active,
              stripe_customer_id, stripe_subscription_id, subscription_status,
              created_at, updated_at
       FROM users WHERE id = ? AND is_active = 1`
    ).get(verified.userId) as User | undefined

    return user ?? null
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getSession()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
  if (!['admin', 'super_admin'].includes(user.role)) throw new Error('Forbidden')
  return user
}

// ─── Cookie helpers ────────────────────────────────────────────────────────────

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: SESSION_TTL,
    path: '/',
  }
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  }
}
