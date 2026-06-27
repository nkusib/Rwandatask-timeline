import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { sanitizeString } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  let user
  try { user = await requireAuth() }
  catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`edd_upload:${user.id}`, 5, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error }, { status: 429 })
  }

  const userRow = db.prepare(
    'SELECT edd_required, edd_deadline FROM users WHERE id = ?'
  ).get(user.id) as { edd_required: number; edd_deadline: number | null } | undefined

  if (!userRow?.edd_required) {
    return NextResponse.json({ error: 'No EDD requirement on your account.' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const docType = sanitizeString(body.documentType || 'utility_bill', 50)
    // In production: this would be a pre-signed S3/R2 URL after the file is uploaded
    const docRef = sanitizeString(body.documentRef || 'pending_upload', 500)

    if (!docRef) {
      return NextResponse.json({ error: 'Document reference is required' }, { status: 400 })
    }

    db.prepare(
      'UPDATE users SET edd_document_ref = ?, updated_at = unixepoch() WHERE id = ?'
    ).run(docRef, user.id)

    db.prepare(`
      INSERT INTO kyc_documents (id, user_id, document_type, status, file_url, notes)
      VALUES (?, ?, ?, 'pending', ?, 'EDD document upload')
    `).run(nanoid(), user.id, docType, docRef)

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'edd_submitted', 'Document received', 'We received your additional verification document. Our team will review it within 1-2 business days.')
    `).run(nanoid(), user.id)

    return NextResponse.json({ ok: true, message: 'Document submitted for review' })
  } catch (err) {
    console.error('[edd-document]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
