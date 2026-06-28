import { NextRequest, NextResponse } from 'next/server'
import { sendPhoneOtp, generateNonce } from '@/lib/otp'
import { rateLimit } from '@/lib/rate-limit'
import { validatePhone } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

  const limit = rateLimit(`otp:${ip}`, 5, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  try {
    const { phone } = await req.json()
    let validPhone: string | null
    try {
      validPhone = validatePhone(phone)
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid phone number' }, { status: 400 })
    }
    if (!validPhone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Generate a session nonce — ties the OTP to this browser/device
    const nonce = generateNonce()

    const result = await sendPhoneOtp(validPhone, { purpose: 'registration' }, nonce)
    if (!result.ok && !result.dev_code) {
      return NextResponse.json({ error: 'Failed to send SMS. Please check the number and try again.' }, { status: 502 })
    }

    const res = NextResponse.json({
      ok: true,
      message: 'Verification code sent',
      ...(result.dev_code ? { dev_code: result.dev_code } : {}),
    })

    // Bind the OTP to this browser session via a short-lived httpOnly cookie
    res.cookies.set('otp_nonce', nonce, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes — matches OTP TTL
      path: '/',
    })

    return res
  } catch (err) {
    console.error('[send-otp]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
