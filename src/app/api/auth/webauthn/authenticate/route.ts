import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { nanoid } from 'nanoid'

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost'
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'

function b64urlDecode(b64url: string): Buffer {
  return Buffer.from(
    b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      b64url.length + ((4 - (b64url.length % 4)) % 4), '='
    ),
    'base64'
  )
}

/**
 * Verifies a WebAuthn authentication assertion.
 * Implements WebAuthn Level 2 §7.2 (Verifying an Authentication Assertion).
 */
async function verifyAssertion({
  clientDataJSON,
  authenticatorData,
  signature,
  publicKeyDer,
  expectedChallenge,
}: {
  clientDataJSON: string
  authenticatorData: string
  signature: string
  publicKeyDer: string
  expectedChallenge: string
}): Promise<{ ok: boolean; counter: number; reason?: string }> {
  try {
    // Step 1: Parse clientDataJSON
    const clientDataBytes = b64urlDecode(clientDataJSON)
    let clientData: Record<string, string>
    try {
      clientData = JSON.parse(clientDataBytes.toString('utf8'))
    } catch {
      return { ok: false, counter: 0, reason: 'Invalid clientDataJSON' }
    }

    // Step 2: Verify type
    if (clientData.type !== 'webauthn.get') {
      return { ok: false, counter: 0, reason: `Expected type 'webauthn.get', got '${clientData.type}'` }
    }

    // Step 3: Verify challenge
    const receivedChallenge = clientData.challenge
    if (receivedChallenge !== expectedChallenge) {
      return { ok: false, counter: 0, reason: 'Challenge mismatch' }
    }

    // Step 4: Verify origin
    const allowedOrigins = [
      ORIGIN,
      'https://' + RP_ID,
      'http://localhost:3000',
      'http://localhost',
    ]
    if (!allowedOrigins.includes(clientData.origin)) {
      return { ok: false, counter: 0, reason: `Origin '${clientData.origin}' not allowed` }
    }

    // Step 5: Parse authenticatorData
    const authDataBytes = b64urlDecode(authenticatorData)
    if (authDataBytes.length < 37) {
      return { ok: false, counter: 0, reason: 'authenticatorData too short' }
    }

    // Step 6: Verify rpIdHash (first 32 bytes = SHA-256 of rpId)
    const rpIdHash = crypto.createHash('sha256').update(RP_ID).digest()
    if (!rpIdHash.equals(authDataBytes.slice(0, 32))) {
      return { ok: false, counter: 0, reason: 'rpId hash mismatch' }
    }

    // Step 7: Check flags — bit 0 = UP (user present), bit 2 = UV (user verified)
    const flags = authDataBytes[32]
    const userPresent = (flags & 0x01) !== 0
    const userVerified = (flags & 0x04) !== 0
    if (!userPresent) return { ok: false, counter: 0, reason: 'User not present' }
    if (!userVerified) return { ok: false, counter: 0, reason: 'User not verified' }

    // Step 8: Extract sign counter (bytes 33-36, big-endian)
    const counter = authDataBytes.readUInt32BE(33)

    // Step 9: Build verification data: authData || SHA-256(clientDataJSON)
    const clientDataHash = crypto.createHash('sha256').update(clientDataBytes).digest()
    const verificationData = Buffer.concat([authDataBytes, clientDataHash])

    // Step 10: Import public key (DER/SPKI format) and verify signature
    const publicKeyBytes = b64urlDecode(publicKeyDer)
    if (publicKeyBytes.length === 0) {
      // Key was not captured during registration (browser didn't support getPublicKey())
      return { ok: false, counter: 0, reason: 'Public key not available — re-register biometric' }
    }

    let publicKey: crypto.KeyObject
    try {
      publicKey = crypto.createPublicKey({ key: publicKeyBytes, format: 'der', type: 'spki' })
    } catch {
      return { ok: false, counter: 0, reason: 'Failed to import public key' }
    }

    const sigBytes = b64urlDecode(signature)

    // sha256 = ECDSA-SHA256 for EC keys, RSA-SHA256 for RSA keys
    const valid = crypto.verify('sha256', verificationData, publicKey, sigBytes)
    if (!valid) return { ok: false, counter: 0, reason: 'Signature invalid' }

    return { ok: true, counter }
  } catch (err: any) {
    return { ok: false, counter: 0, reason: err.message }
  }
}

// ─── GET: issue login challenge ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`webauthn_auth_challenge:${ip}`, 20, 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error }, { status: 429 })
  }

  const email = req.nextUrl.searchParams.get('email')

  // Generate challenge and persist it (2-minute TTL)
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const challenge = Buffer.from(bytes).toString('base64url')
  const expiresAt = Math.floor(Date.now() / 1000) + 120

  db.prepare(
    'INSERT INTO webauthn_challenges (id, challenge, user_id, purpose, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(nanoid(), challenge, null, 'login', expiresAt)

  // If email provided, include allowCredentials so browser targets their credentials
  let allowCredentials: { type: string; id: string }[] = []
  if (email) {
    const user = db.prepare('SELECT id FROM users WHERE email = ? AND is_active = 1')
      .get(email.toLowerCase().trim()) as { id: string } | undefined
    if (user) {
      const creds = db.prepare(
        'SELECT credential_id FROM webauthn_credentials WHERE user_id = ?'
      ).all(user.id) as { credential_id: string }[]
      allowCredentials = creds.map(c => ({ type: 'public-key', id: c.credential_id }))
    }
  }

  return NextResponse.json({
    challenge,
    rpId: RP_ID,
    timeout: 120000,
    userVerification: 'required',
    allowCredentials,
  })
}

// ─── POST: verify assertion and issue session ─────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`webauthn_auth:${ip}`, 10, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  const userAgent = req.headers.get('user-agent') || ''

  try {
    const body = await req.json()
    const { credentialId, clientDataJSON, authenticatorData, signature } = body

    if (!credentialId || !clientDataJSON || !authenticatorData || !signature) {
      return NextResponse.json({ error: 'Missing assertion fields' }, { status: 400 })
    }

    // Step 1: Look up credential
    const cred = db.prepare(
      'SELECT id, user_id, public_key, counter FROM webauthn_credentials WHERE credential_id = ?'
    ).get(credentialId) as {
      id: string; user_id: string; public_key: string; counter: number
    } | undefined

    if (!cred) {
      return NextResponse.json({ error: 'Credential not recognised. Please use email and password.' }, { status: 401 })
    }

    // Step 2: Decode clientDataJSON to extract and look up the challenge
    let parsedChallenge: string
    try {
      const decoded = JSON.parse(b64urlDecode(clientDataJSON).toString('utf8'))
      parsedChallenge = decoded.challenge
    } catch {
      return NextResponse.json({ error: 'Invalid clientDataJSON' }, { status: 400 })
    }

    const challengeRow = db.prepare(
      `SELECT id FROM webauthn_challenges
       WHERE challenge = ? AND purpose = 'login' AND used = 0 AND expires_at > unixepoch()`
    ).get(parsedChallenge) as { id: string } | undefined

    if (!challengeRow) {
      return NextResponse.json({ error: 'Challenge expired or already used. Please try again.' }, { status: 401 })
    }

    // Mark challenge as used immediately (prevent replay)
    db.prepare('UPDATE webauthn_challenges SET used = 1 WHERE id = ?').run(challengeRow.id)

    // Step 3: Verify the assertion cryptographically
    const result = await verifyAssertion({
      clientDataJSON,
      authenticatorData,
      signature,
      publicKeyDer: cred.public_key,
      expectedChallenge: parsedChallenge,
    })

    if (!result.ok) {
      console.error('[webauthn authenticate] Assertion failed:', result.reason)
      return NextResponse.json({ error: 'Biometric authentication failed. Please use email and password.' }, { status: 401 })
    }

    // Step 4: Counter check (replay protection)
    // counter === 0 means the authenticator doesn't use counters (platform authenticators often don't)
    if (result.counter > 0 && result.counter <= cred.counter) {
      // Possible cloned authenticator — flag it
      console.error(`[webauthn] Counter regression for credential ${cred.id}: stored=${cred.counter}, received=${result.counter}`)
      return NextResponse.json({ error: 'Security check failed. Please contact support.' }, { status: 401 })
    }

    // Update counter
    db.prepare(
      'UPDATE webauthn_credentials SET counter = ? WHERE id = ?'
    ).run(result.counter, cred.id)

    // Step 5: Load user
    const user = db.prepare(
      `SELECT id, role, is_active FROM users WHERE id = ? AND is_active = 1`
    ).get(cred.user_id) as { id: string; role: string; is_active: number } | undefined

    if (!user) {
      return NextResponse.json({ error: 'Account not found or suspended.' }, { status: 403 })
    }

    // Step 6: Issue tracked session
    const token = await createSession(user.id, user.role, ip, userAgent)
    const res = NextResponse.json({ ok: true, role: user.role })
    res.cookies.set(setSessionCookie(token))
    return res
  } catch (err) {
    console.error('[webauthn authenticate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
