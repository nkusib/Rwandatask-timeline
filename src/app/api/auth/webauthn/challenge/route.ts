import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

// In production, store challenges in Redis/DB with TTL. Here we sign them into the response.
function generateChallenge(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

export async function GET() {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`webauthn_challenge:${ip}`, 20, 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error }, { status: 429 })
  }

  const challenge = generateChallenge()
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
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 },  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  })
}
