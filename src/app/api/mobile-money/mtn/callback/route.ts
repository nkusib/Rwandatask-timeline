import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyHmacSignature } from '@/lib/webhook-verify'
import { nanoid } from 'nanoid'

/**
 * MTN MoMo callback — fires when a disbursement or collection changes status.
 * MTN signs the body with HMAC-SHA256 using your subscription key.
 * Set MTN_WEBHOOK_SECRET to your MTN API key / subscription key.
 *
 * Payload schema: https://mtnmomo.readme.io/docs/callbacks
 * {
 *   "externalId": "RF...",
 *   "financialTransactionId": "MTN...",
 *   "status": "SUCCESSFUL" | "FAILED",
 *   "reason": "..."  // present if FAILED
 * }
 */
export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get('x-callback-signature')

  const { ok, reason } = verifyHmacSignature(rawBody, sig, process.env.MTN_WEBHOOK_SECRET)
  if (!ok) {
    console.warn('[mtn-callback] Rejected:', reason)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { externalId, financialTransactionId, status, reason: failReason } = payload

  if (!externalId || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // MTN uses our reference as externalId
  const txn = db.prepare(
    'SELECT id, user_id, receive_amount, receive_currency, recipient_name, status FROM transactions WHERE reference = ?'
  ).get(externalId) as { id: string; user_id: string; receive_amount: number; receive_currency: string; recipient_name: string; status: string } | undefined

  if (!txn) {
    // Unknown reference — acknowledge so MTN doesn't retry
    console.warn('[mtn-callback] Unknown reference:', externalId)
    return NextResponse.json({ ok: true })
  }

  // Idempotent — skip if already in a terminal state
  if (txn.status === 'completed' || txn.status === 'failed') {
    return NextResponse.json({ ok: true })
  }

  const now = Math.floor(Date.now() / 1000)

  if (status === 'SUCCESSFUL') {
    db.prepare(
      'UPDATE transactions SET status = ?, provider_reference = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    ).run('completed', financialTransactionId ?? externalId, now, now, txn.id)

    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(
      nanoid(), txn.user_id, 'transfer_complete',
      'Transfer completed!',
      `Your transfer of ${txn.receive_currency} ${txn.receive_amount} to ${txn.recipient_name} has been delivered via MTN MoMo.`
    )
  } else if (status === 'FAILED') {
    db.prepare(
      'UPDATE transactions SET status = ?, updated_at = ?, notes = ? WHERE id = ?'
    ).run('failed', now, failReason ?? 'MTN disbursement failed', txn.id)

    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(
      nanoid(), txn.user_id, 'transfer_failed',
      'Transfer failed',
      `Your transfer to ${txn.recipient_name} could not be completed. Our team will investigate and contact you.`
    )
  }

  return NextResponse.json({ ok: true })
}
