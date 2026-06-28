import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSession } from '@/lib/auth'
import { sendPhoneOtp, verifyPhoneOtp, generateNonce } from '@/lib/otp'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

const STEP_UP_TOKEN_TTL = 300 // 5 minutes

// GET — send an OTP to the authenticated user's registered phone
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.phone) return NextResponse.json({ error: 'No phone number on your account. Contact support.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`step_up_send:${user.id}`, 5, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  const nonce = generateNonce()

  const result = await sendPhoneOtp(user.phone, { purpose: 'step_up' }, nonce)
  if (!result.ok && !result.dev_code) {
    return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 502 })
  }

  const maskedPhone = user.phone.length > 4
    ? user.phone.slice(0, -4).replace(/\d/g, '*') + user.phone.slice(-4)
    : '****'

  const res = NextResponse.json({
    ok: true,
    maskedPhone,
    ...(result.dev_code ? { dev_code: result.dev_code } : {}),
  })

  res.cookies.set('otp_step_nonce', nonce, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })

  return res
}

// POST — verify OTP and issue a short-lived transfer token bound to the transfer context
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.phone) return NextResponse.json({ error: 'No phone number on account.' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`step_up_verify:${user.id}`, 10, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  try {
    const { otp, context } = await req.json()
    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
    }
    if (!context?.amount || !context?.currency || !context?.recipient) {
      return NextResponse.json({ error: 'Transfer context is required' }, { status: 400 })
    }

    const nonce = req.cookies.get('otp_step_nonce')?.value

    const result = verifyPhoneOtp(user.phone, otp, nonce)
    if (!result.valid) {
      return NextResponse.json({ error: result.reason || 'Invalid code' }, { status: 400 })
    }

    // Bind the transfer token to the exact transfer parameters
    const contextHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        userId: user.id,
        amount: Number(context.amount).toFixed(2),
        currency: context.currency,
        recipient: String(context.recipient).toLowerCase().trim(),
      }))
      .digest('hex')

    const token = nanoid(32)
    const expiresAt = Math.floor(Date.now() / 1000) + STEP_UP_TOKEN_TTL

    db.prepare(
      'INSERT INTO transfer_tokens (id, user_id, token, context_hash, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).run(nanoid(), user.id, token, contextHash, expiresAt)

    const res = NextResponse.json({ ok: true, token, expiresIn: STEP_UP_TOKEN_TTL })
    res.cookies.set('otp_step_nonce', '', { maxAge: 0, path: '/' })
    return res
  } catch (err) {
    console.error('[step-up POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
