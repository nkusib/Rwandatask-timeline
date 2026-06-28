import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import { verifyPhoneOtp } from '@/lib/otp'
import { rateLimit } from '@/lib/rate-limit'
import { validateEmail, validatePassword, validateName, validatePhone, validateCountry } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const userAgent = req.headers.get('user-agent') || ''

  const limit = rateLimit(`verify_phone:${ip}`, 10, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { otp, ...formData } = body

    let email: string, password: string, name: string
    try {
      email = validateEmail(formData.email)
      password = validatePassword(formData.password)
      name = validateName(formData.name)
    } catch (e: any) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 })
    }

    const phone = (() => {
      try { return validatePhone(formData.phone) } catch { return null }
    })()
    if (!phone) {
      return NextResponse.json({ error: 'Valid phone number is required for verification', field: 'phone' }, { status: 400 })
    }
    const country = validateCountry(formData.country)

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Verification code is required', field: 'otp' }, { status: 400 })
    }

    // Read session nonce from cookie (set by /api/auth/send-otp)
    const nonce = req.cookies.get('otp_nonce')?.value

    const otpResult = verifyPhoneOtp(phone, otp, nonce)
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.reason || 'Invalid code', field: 'otp' }, { status: 400 })
    }

    // Duplicate email check
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Duplicate phone check — one phone per account
    if (db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)) {
      return NextResponse.json(
        { error: 'This phone number is already linked to another account. Contact support if this is an error.' },
        { status: 409 }
      )
    }

    const id = nanoid()
    const hash = await bcrypt.hash(password, 12)

    db.prepare(
      'INSERT INTO users (id, email, name, password_hash, phone, country, phone_verified) VALUES (?, ?, ?, ?, ?, ?, 1)'
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

    const token = await createSession(id, 'user', ip, userAgent)
    const res = NextResponse.json({ ok: true, role: 'user' })
    res.cookies.set(setSessionCookie(token))
    // Clear the nonce cookie
    res.cookies.set('otp_nonce', '', { maxAge: 0, path: '/' })
    return res
  } catch (err) {
    console.error('[verify-phone]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
