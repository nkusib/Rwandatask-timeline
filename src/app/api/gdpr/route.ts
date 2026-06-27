import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

/** GDPR Article 20 — Data portability: export all personal data */
export async function GET() {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const limit = rateLimit(`gdpr_export:${user.id}`, 3, 24 * 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Export limit reached. Try again in 24 hours.' }, { status: 429 })
  }

  const profile = db.prepare(
    `SELECT id, email, name, phone, country, kyc_status, kyc_level,
            date_of_birth, address, nationality, created_at
     FROM users WHERE id = ?`
  ).get(user.id)

  const transactions = db.prepare(
    `SELECT id, type, status, send_amount, send_currency, receive_amount, receive_currency,
            fee, payment_method, delivery_method, recipient_name, recipient_country,
            reference, created_at, completed_at
     FROM transactions WHERE user_id = ? ORDER BY created_at DESC`
  ).all(user.id)

  const recipients = db.prepare(
    'SELECT name, country, payment_method, bank_name, mobile_number, mobile_provider, email, created_at FROM recipients WHERE user_id = ?'
  ).all(user.id)

  const export_data = {
    exported_at: new Date().toISOString(),
    data_controller: 'RemitFlow Ltd',
    profile,
    transactions,
    recipients,
  }

  return new NextResponse(JSON.stringify(export_data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="remitflow-data-export-${Date.now()}.json"`,
    },
  })
}

/** GDPR Article 17 — Right to erasure (right to be forgotten) */
export async function DELETE(req: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { confirmation } = await req.json()
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'Please type DELETE MY ACCOUNT to confirm account deletion.' },
        { status: 400 }
      )
    }

    // Check for pending transactions
    const pendingTxns = db.prepare(
      "SELECT COUNT(*) as n FROM transactions WHERE user_id = ? AND status IN ('pending','processing')"
    ).get(user.id) as { n: number }

    if (pendingTxns.n > 0) {
      return NextResponse.json(
        { error: 'Cannot delete account with pending transactions. Wait for them to complete.' },
        { status: 409 }
      )
    }

    // Anonymize rather than hard delete (required for AML/regulatory retention 5 years)
    db.prepare(`
      UPDATE users SET
        email = 'deleted_' || id || '@remitflow.deleted',
        name = 'Deleted User',
        phone = NULL,
        date_of_birth = NULL,
        address = NULL,
        nationality = NULL,
        is_active = 0,
        updated_at = unixepoch()
      WHERE id = ?
    `).run(user.id)

    // Delete non-regulated data
    db.prepare('DELETE FROM recipients WHERE user_id = ?').run(user.id)
    db.prepare('DELETE FROM webauthn_credentials WHERE user_id = ?').run(user.id)
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id)

    const res = NextResponse.json({ ok: true, message: 'Account deleted. Transaction records are retained for 5 years per AML regulations.' })
    res.cookies.delete('rf_session')
    return res
  } catch (err) {
    console.error('[gdpr DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
