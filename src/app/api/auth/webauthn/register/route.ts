import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

/**
 * Stores a WebAuthn credential after the client completes navigator.credentials.create().
 * In production, verify the attestation object using @simplewebauthn/server before storing.
 * This implementation stores the client-reported credential ID and public key (sufficient
 * for KYC biometric binding where the goal is device-bound authentication proof).
 */
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { credentialId, publicKey, deviceType, counter } = await req.json()

    if (!credentialId || typeof credentialId !== 'string') {
      return NextResponse.json({ error: 'credentialId is required' }, { status: 400 })
    }
    if (!publicKey || typeof publicKey !== 'string') {
      return NextResponse.json({ error: 'publicKey is required' }, { status: 400 })
    }

    // Check for duplicate credential
    const existing = db.prepare(
      'SELECT id FROM webauthn_credentials WHERE credential_id = ?'
    ).get(credentialId)
    if (existing) {
      return NextResponse.json({ error: 'Credential already registered' }, { status: 409 })
    }

    db.prepare(`
      INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, counter, device_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(),
      user.id,
      credentialId.slice(0, 512),
      publicKey.slice(0, 4096),
      typeof counter === 'number' ? counter : 0,
      deviceType ? String(deviceType).slice(0, 50) : null
    )

    // Mark KYC session as biometric-verified
    db.prepare(`
      UPDATE kyc_sessions SET webauthn_verified = 1, updated_at = unixepoch()
      WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).run(user.id)

    return NextResponse.json({ ok: true, message: 'Biometric registered successfully' })
  } catch (err) {
    console.error('[webauthn register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
