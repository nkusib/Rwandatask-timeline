import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { headers } from 'next/headers'
import { nanoid } from 'nanoid'

function generateChallenge(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

/** Registration challenge — requires an existing session */
export async function GET() {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`webauthn_reg_challenge:${ip}`, 10, 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error }, { status: 429 })
  }

  const challenge = generateChallenge()
  const expiresAt = Math.floor(Date.now() / 1000) + 120

  // Store challenge so registration can verify it
  db.prepare(
    'INSERT INTO webauthn_challenges (id, challenge, user_id, purpose, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(nanoid(), challenge, user.id, 'register', expiresAt)

  const rpId = process.env.WEBAUTHN_RP_ID || 'localhost'
  const rpName = process.env.WEBAUTHN_RP_NAME || 'RemitFlow'

  return NextResponse.json({
    challenge,
    rp: { id: rpId, name: rpName },
    user: {
      id: Buffer.from(user.id).toString('base64url'),
      name: user.email,
      displayName: user.name,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256 (ECDSA P-256)
      { type: 'public-key', alg: -257 },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required', // required for passkey/discoverable credentials
    },
    timeout: 120000,
    attestation: 'none',
  })
}
