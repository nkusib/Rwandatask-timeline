import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'
import type { User } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'remitflow-secret-change-in-production-min-32-chars'
)

export const COOKIE_NAME = 'rf_session'

export async function createToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub) return null
    return { userId: payload.sub as string, role: (payload.role as string) || 'user' }
  } catch {
    return null
  }
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const verified = await verifyToken(token)
    if (!verified) return null

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

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24,
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
