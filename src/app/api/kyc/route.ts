import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeString } from '@/lib/validation'
import { screenPerson } from '@/lib/sanctions'
import { nanoid } from 'nanoid'

export async function GET() {
  try {
    const user = await requireAuth()
    const session = db.prepare(
      `SELECT id, status, date_of_birth, nationality, id_type, liveness_score,
              webauthn_verified, created_at
       FROM kyc_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).get(user.id)
    return NextResponse.json({
      status: user.kyc_status,
      level: user.kyc_level,
      sanctions_status: (user as any).sanctions_status,
      edd_required: (user as any).edd_required,
      edd_deadline: (user as any).edd_deadline,
      session,
    })
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
    const idDocumentRef = sanitizeString(body.idDocumentRef || 'pending_upload', 500)
    const selfieRef = sanitizeString(body.selfieRef || 'pending_upload', 500)
    const webauthnVerified = body.webauthnVerified === true ? 1 : 0
    const livenessScore = typeof body.livenessScore === 'number'
      ? Math.min(1, Math.max(0, body.livenessScore)) : null

    if (!dateOfBirth || !nationality || !address || !idType || !idNumber) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Age check: 18+
    const dob = new Date(dateOfBirth)
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (isNaN(age) || age < 18) {
      return NextResponse.json({ error: 'You must be at least 18 years old.' }, { status: 400 })
    }

    // === SANCTIONS & PEP SCREENING ===
    const sanctionsResult = await screenPerson(user.name, dateOfBirth, nationality)
    const sanctionsStatus = sanctionsResult.clear ? 'clear' : 'flagged'

    db.prepare(
      'UPDATE users SET sanctions_status = ?, sanctions_checked_at = unixepoch() WHERE id = ?'
    ).run(sanctionsStatus, user.id)

    if (!sanctionsResult.clear) {
      // Flag for manual review — do not tell user they are flagged
      db.prepare(`
        INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details)
        VALUES (?, 'system', 'sanctions_flag', 'user', ?, ?)
      `).run(nanoid(), user.id, JSON.stringify({
        reason: sanctionsResult.reason,
        matches: sanctionsResult.matches,
      }))
    }

    const sessionId = nanoid()
    db.prepare(`
      INSERT INTO kyc_sessions (id, user_id, status, date_of_birth, nationality, address, id_type, id_number, id_document_ref, selfie_ref, liveness_score, webauthn_verified)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, user.id, dateOfBirth, nationality, address, idType, idNumber, idDocumentRef, selfieRef, livenessScore, webauthnVerified)

    db.prepare(`
      INSERT INTO kyc_documents (id, user_id, document_type, status, file_url)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(nanoid(), user.id, idType, idDocumentRef)

    db.prepare(`
      UPDATE users SET date_of_birth = ?, address = ?, nationality = ?, updated_at = unixepoch()
      WHERE id = ?
    `).run(dateOfBirth, address, nationality, user.id)

    // === HYBRID AUTO-APPROVAL LOGIC ===
    const hasLiveness = livenessScore !== null && livenessScore >= 0.85
    const hasAllFields = !!(dateOfBirth && nationality && address && idType && idNumber && idDocumentRef && selfieRef)
    const hasBiometric = webauthnVerified === 1
    const isSanctionsClear = sanctionsResult.clear

    const autoApprove = hasLiveness && hasAllFields && isSanctionsClear && hasBiometric

    if (autoApprove) {
      // Auto-approve to Level 1 (£500/day)
      db.prepare(`
        UPDATE users SET kyc_status = 'verified', kyc_level = 1, updated_at = unixepoch()
        WHERE id = ?
      `).run(user.id)
      db.prepare(`
        UPDATE kyc_sessions SET status = 'approved', updated_at = unixepoch() WHERE id = ?
      `).run(sessionId)
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, 'kyc_approved', 'Identity verified!', 'Your identity has been verified automatically. You can now send up to £500/day.')
      `).run(nanoid(), user.id)
      db.prepare(`
        INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details)
        VALUES (?, 'system', 'kyc_auto_approved', 'user', ?, ?)
      `).run(nanoid(), user.id, JSON.stringify({ livenessScore, webauthnVerified, sanctionsStatus }))

      return NextResponse.json({
        ok: true, sessionId,
        autoApproved: true,
        message: 'Verified! You can now send up to £500/day.',
      })
    }

    // Manual queue: update status to pending
    db.prepare(
      "UPDATE users SET kyc_status = 'pending', updated_at = unixepoch() WHERE id = ?"
    ).run(user.id)

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'kyc_submitted', 'Verification received', 'Your documents are under review. We will notify you within 1-2 hours.')
    `).run(nanoid(), user.id)

    const queueReason = [
      !hasLiveness ? 'liveness score below threshold' : null,
      !hasBiometric ? 'biometric not registered' : null,
      !isSanctionsClear ? 'compliance review required' : null,
    ].filter(Boolean).join(', ')

    return NextResponse.json({
      ok: true, sessionId,
      autoApproved: false,
      message: 'Submitted for review. Usually 1-2 hours.',
      queueReason, // visible to admin, not surfaced in UI to user
    })
  } catch (err) {
    console.error('[kyc POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
