import { db } from './db'
import { nanoid } from 'nanoid'
import crypto from 'crypto'

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export type OtpContext = {
  purpose?: 'registration' | 'step_up'
  amount?: string
  currency?: string
  recipient?: string
}

export async function sendPhoneOtp(
  phone: string,
  context?: OtpContext,
  sessionNonce?: string
): Promise<{ ok: boolean; dev_code?: string }> {
  // Invalidate any existing unused OTP for this phone
  db.prepare('UPDATE otp_codes SET used = 1 WHERE phone = ? AND used = 0').run(phone)

  const code = generateCode()
  const expiresAt = Math.floor((Date.now() + OTP_TTL_MS) / 1000)
  db.prepare(
    'INSERT INTO otp_codes (id, phone, code, expires_at, session_nonce) VALUES (?, ?, ?, ?, ?)'
  ).run(nanoid(), phone, code, expiresAt, sessionNonce ?? null)

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  // Build contextual message so users can detect social-engineering attempts
  let body: string
  if (context?.purpose === 'step_up' && context.amount && context.recipient) {
    body = `RemitFlow security code: ${code}. Authorising transfer of ${context.amount} ${context.currency ?? ''} to ${context.recipient}. Valid 10 mins. We will NEVER call and ask for this code.`
  } else {
    body = `RemitFlow verification code: ${code}. Valid for 10 minutes. We will NEVER call and ask for this code.`
  }

  if (!sid || !token || !from) {
    console.log(`[OTP dev] Code for ${phone}: ${code}`)
    return { ok: true, dev_code: code }
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: from, Body: body }).toString(),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[Twilio]', err)
    return { ok: false }
  }

  return { ok: true }
}

export function verifyPhoneOtp(
  phone: string,
  code: string,
  sessionNonce?: string
): { valid: boolean; reason?: string } {
  type Row = { id: string; code: string; expires_at: number; attempts: number; session_nonce: string | null }
  const row = db.prepare(
    'SELECT id, code, expires_at, attempts, session_nonce FROM otp_codes WHERE phone = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(phone) as Row | undefined

  if (!row) return { valid: false, reason: 'No code found. Please request a new code.' }

  if (row.attempts >= 5) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id)
    return { valid: false, reason: 'Too many attempts. Please request a new code.' }
  }

  if (Math.floor(Date.now() / 1000) > row.expires_at) {
    return { valid: false, reason: 'Code expired. Please request a new code.' }
  }

  // Session binding: if a nonce was stored, the verifier must present the same nonce
  if (row.session_nonce && !sessionNonce) {
    return { valid: false, reason: 'Session mismatch. Please request a new code.' }
  }
  if (row.session_nonce && sessionNonce && row.session_nonce !== sessionNonce) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id)
    return { valid: false, reason: 'Invalid session. Please request a new code from this device.' }
  }

  db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id)

  if (row.code !== code.trim()) {
    return { valid: false, reason: 'Incorrect code.' }
  }

  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id)
  return { valid: true }
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}
