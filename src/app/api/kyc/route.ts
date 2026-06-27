import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeString } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function GET() {
  try {
    const user = await requireAuth()
    const session = db.prepare(
      'SELECT * FROM kyc_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(user.id)
    return NextResponse.json({ status: user.kyc_status, level: user.kyc_level, session })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`kyc:${user.id}`, 3, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  // Don't allow re-submission if already pending or verified
  if (user.kyc_status === 'pending') {
    return NextResponse.json({ error: 'Verification already under review.' }, { status: 409 })
  }
  if (user.kyc_status === 'verified') {
    return NextResponse.json({ error: 'Already verified.' }, { status: 409 })
  }

  try {
    const body = await req.json()

    const dateOfBirth = sanitizeString(body.dateOfBirth, 10)
    const nationality = sanitizeString(body.nationality, 100)
    const address = sanitizeString(body.address, 500)
    const idType = sanitizeString(body.idType, 50)
    const idNumber = sanitizeString(body.idNumber, 50)
    // In production: these would be secure upload URLs (S3/R2 pre-signed)
    const idDocumentRef = sanitizeString(body.idDocumentRef || 'pending_upload', 500)
    const selfieRef = sanitizeString(body.selfieRef || 'pending_upload', 500)
    const webauthnVerified = body.webauthnVerified === true ? 1 : 0
    const livenessScore = typeof body.livenessScore === 'number' ? Math.min(1, Math.max(0, body.livenessScore)) : null

    if (!dateOfBirth || !nationality || !address || !idType || !idNumber) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Validate minimum age (18+)
    const dob = new Date(dateOfBirth)
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (isNaN(age) || age < 18) {
      return NextResponse.json({ error: 'You must be at least 18 years old.' }, { status: 400 })
    }

    const sessionId = nanoid()
    db.prepare(`
      INSERT INTO kyc_sessions (id, user_id, status, date_of_birth, nationality, address, id_type, id_number, id_document_ref, selfie_ref, liveness_score, webauthn_verified)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, dateOfBirth, nationality, address, idType, idNumber, idDocumentRef, selfieRef, livenessScore, webauthnVerified)

    // Store doc reference
    db.prepare(`
      INSERT INTO kyc_documents (id, user_id, document_type, status, file_url)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(nanoid(), user.id, idType, idDocumentRef)

    // Update user info and kyc_status
    db.prepare(`
      UPDATE users SET kyc_status = 'pending', date_of_birth = ?, address = ?, nationality = ?, updated_at = unixepoch()
      WHERE id = ?
    `).run(dateOfBirth, address, nationality, user.id)

    // Notify admin (in production: trigger review queue or automated OCR)
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'kyc_submitted', 'Verification received', 'Your identity documents are under review. We will notify you within 1-2 hours.')
    `).run(nanoid(), user.id)

    return NextResponse.json({ ok: true, sessionId, message: 'Verification submitted for review' })
  } catch (err) {
    console.error('[kyc POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
