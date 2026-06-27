import { NextRequest, NextResponse } from 'next/server'
import { sendPhoneOtp } from '@/lib/otp'
import { rateLimit } from '@/lib/rate-limit'
import { validatePhone } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

  // 5 OTP requests per 15 minutes per IP
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

    const result = await sendPhoneOtp(validPhone)
    if (!result.ok && !result.dev_code) {
      return NextResponse.json({ error: 'Failed to send SMS. Please check the number and try again.' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Verification code sent',
      // Only included when Twilio is not configured (development)
      ...(result.dev_code ? { dev_code: result.dev_code } : {}),
    })
  } catch (err) {
    console.error('[send-otp]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
