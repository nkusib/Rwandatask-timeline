import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createToken, setSessionCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { validateEmail, validatePassword, validateName, validatePhone, validateCountry } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

  // 5 registrations per hour per IP
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.error, retryAfter: limit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  try {
    const body = await req.json()

    let email: string, password: string, name: string
    try {
      email = validateEmail(body.email)
      password = validatePassword(body.password)
      name = validateName(body.name)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Validation error', field: e.field }, { status: 400 })
    }

    const phone = (() => {
      try { return validatePhone(body.phone) } catch { return null }
    })()
    const country = validateCountry(body.country)

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const id = nanoid()
    const hash = await bcrypt.hash(password, 12)

    db.prepare(
      'INSERT INTO users (id, email, name, password_hash, phone, country) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, email, name, hash, phone, country)

    const currencyMap: Record<string, string> = {
      GB: 'GBP', DE: 'EUR', FR: 'EUR', BE: 'EUR', NL: 'EUR',
      ES: 'EUR', IT: 'EUR', PT: 'EUR', IE: 'EUR', US: 'USD',
      NG: 'NGN', KE: 'KES', GH: 'GHS', ZA: 'ZAR', TZ: 'TZS',
    }
    const primaryCurrency = currencyMap[country] || 'GBP'
    db.prepare(
      'INSERT INTO wallets (id, user_id, currency, balance, is_primary) VALUES (?, ?, ?, ?, ?)'
    ).run(nanoid(), id, primaryCurrency, 0, 1)

    if (primaryCurrency !== 'USD') {
      db.prepare(
        'INSERT INTO wallets (id, user_id, currency, balance, is_primary) VALUES (?, ?, ?, ?, ?)'
      ).run(nanoid(), id, 'USD', 0, 0)
    }

    const token = await createToken(id, 'user')
    const res = NextResponse.json({ ok: true, role: 'user' })
    res.cookies.set(setSessionCookie(token))
    return res
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
