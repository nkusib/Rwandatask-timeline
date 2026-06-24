import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db, User } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'
)

const COOKIE_NAME = 'ttp_session'

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.sub as string
  } catch {
    return null
  }
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const userId = await verifyToken(token)
    if (!userId) return null

    const user = db.prepare(
      'SELECT id, email, name, plan, stripe_customer_id, stripe_subscription_id, subscription_status, created_at FROM users WHERE id = ?'
    ).get(userId) as User | undefined

    return user ?? null
  } catch {
    return null
  }
}

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  }
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
  }
}

export const PLAN_LIMITS = {
  free: { projects: 1, tasks: 10, teamMembers: 0 },
  pro: { projects: 50, tasks: 1000, teamMembers: 0 },
  team: { projects: 100, tasks: 5000, teamMembers: 10 },
  business: { projects: Infinity, tasks: Infinity, teamMembers: Infinity },
}
