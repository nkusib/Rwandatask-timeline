import { db } from './db'
import { nanoid } from 'nanoid'

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendPhoneOtp(phone: string): Promise<{ ok: boolean; dev_code?: string }> {
  // Invalidate any existing OTP for this phone
  db.prepare('UPDATE otp_codes SET used = 1 WHERE phone = ? AND used = 0').run(phone)

  const code = generateCode()
  const expiresAt = Math.floor((Date.now() + OTP_TTL_MS) / 1000)
  db.prepare(
    'INSERT INTO otp_codes (id, phone, code, expires_at) VALUES (?, ?, ?, ?)'
  ).run(nanoid(), phone, code, expiresAt)

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!sid || !token || !from) {
    // Development mode: code is returned in response (never do this in production)
    console.log(`[OTP dev] Code for ${phone}: ${code}`)
    return { ok: true, dev_code: code }
  }

  const body = `Your RemitFlow verification code is: ${code}. Valid for 10 minutes. Do not share this code.`
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

export function verifyPhoneOtp(phone: string, code: string): { valid: boolean; reason?: string } {
  const row = db.prepare(
    'SELECT id, code, expires_at, attempts FROM otp_codes WHERE phone = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(phone) as { id: string; code: string; expires_at: number; attempts: number } | undefined

  if (!row) return { valid: false, reason: 'No code found. Please request a new code.' }

  if (row.attempts >= 5) {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id)
    return { valid: false, reason: 'Too many attempts. Please request a new code.' }
  }

  if (Math.floor(Date.now() / 1000) > row.expires_at) {
    return { valid: false, reason: 'Code expired. Please request a new code.' }
  }

  db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id)

  if (row.code !== code.trim()) {
    return { valid: false, reason: 'Incorrect code.' }
  }

  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id)
  return { valid: true }
}
