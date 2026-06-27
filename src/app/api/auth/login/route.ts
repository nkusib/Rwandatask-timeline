import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createToken, setSessionCookie } from '@/lib/auth'
import { rateLimit, recordFailedAuth, clearFailedAuth, checkAuthLock } from '@/lib/rate-limit'
import { validateEmail } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

  // Rate limit: 10 attempts per 15 minutes per IP
  const ipLimit = rateLimit(`login_ip:${ip}`, 10, 15 * 60 * 1000)
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: ipLimit.error, retryAfter: ipLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfter) } }
    )
  }

  try {
    const body = await req.json()
    let email: string
    try {
      email = validateEmail(body.email)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid email' }, { status: 400 })
    }

    const { password } = body
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // Check progressive lockout before expensive bcrypt
    const lockState = checkAuthLock(ip, email)
    if (lockState.locked) {
      return NextResponse.json(
        { error: `Account locked. Try again in ${Math.ceil(lockState.lockSeconds / 60)} minute(s).`, retryAfter: lockState.lockSeconds },
        { status: 429, headers: { 'Retry-After': String(lockState.lockSeconds) } }
      )
    }

    const user = db.prepare(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = ?'
    ).get(email) as {
      id: string; email: string; password_hash: string; role: string; is_active: number
    } | undefined

    if (!user) {
      // Constant-time comparison to prevent user enumeration via timing
      await bcrypt.compare(password, '$2a$10$dummyhashpadding000000000000000000000000000000000000000000')
      recordFailedAuth(ip, email)
      db.prepare('INSERT INTO login_attempts (id, ip, email, success) VALUES (?, ?, ?, ?)').run(nanoid(), ip, email, 0)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Account suspended. Contact support.' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    db.prepare('INSERT INTO login_attempts (id, ip, email, success) VALUES (?, ?, ?, ?)').run(nanoid(), ip, email, valid ? 1 : 0)

    if (!valid) {
      const result = recordFailedAuth(ip, email)
      if (result.locked) {
        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${Math.ceil(result.lockSeconds / 60)} minute(s).` },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Success — clear lockout
    clearFailedAuth(ip, email)

    const token = await createToken(user.id, user.role)
    const res = NextResponse.json({ ok: true, role: user.role })
    res.cookies.set(setSessionCookie(token))
    return res
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
