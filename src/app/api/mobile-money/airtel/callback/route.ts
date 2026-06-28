import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyHmacSignature } from '@/lib/webhook-verify'
import { nanoid } from 'nanoid'

/**
 * Airtel Money callback — fires when a payment or disbursement changes status.
 * Airtel signs the body with HMAC-SHA256 using your client secret.
 * Set AIRTEL_WEBHOOK_SECRET to your Airtel client secret.
 *
 * Payload schema: https://developers.airtel.africa/documentation
 * {
 *   "transaction": {
 *     "id": "RF...",
 *     "status": "TS" | "TF" | "TP",  // TS=success, TF=failed, TP=pending
 *     "message": "..."
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get('x-signature')

  const { ok, reason } = verifyHmacSignature(rawBody, sig, process.env.AIRTEL_WEBHOOK_SECRET)
  if (!ok) {
    console.warn('[airtel-callback] Rejected:', reason)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const txnData = payload?.transaction
  if (!txnData?.id || !txnData?.status) {
    return NextResponse.json({ error: 'Missing transaction fields' }, { status: 400 })
  }

  const { id: reference, status: airtelStatus, message } = txnData

  const txn = db.prepare(
    'SELECT id, user_id, receive_amount, receive_currency, recipient_name, status FROM transactions WHERE reference = ?'
  ).get(reference) as {
    id: string; user_id: string; receive_amount: number; receive_currency: string; recipient_name: string; status: string
  } | undefined

  if (!txn) {
    console.warn('[airtel-callback] Unknown reference:', reference)
    return NextResponse.json({ ok: true })
  }

  if (txn.status === 'completed' || txn.status === 'failed') {
    return NextResponse.json({ ok: true })
  }

  const now = Math.floor(Date.now() / 1000)

  // TS = transaction success, TF = transaction failed, TP = transaction pending
  if (airtelStatus === 'TS') {
    db.prepare(
      'UPDATE transactions SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    ).run('completed', now, now, txn.id)

    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(
      nanoid(), txn.user_id, 'transfer_complete',
      'Transfer completed!',
      `Your transfer of ${txn.receive_currency} ${txn.receive_amount} to ${txn.recipient_name} has been delivered via Airtel Money.`
    )
  } else if (airtelStatus === 'TF') {
    db.prepare(
      'UPDATE transactions SET status = ?, updated_at = ?, notes = ? WHERE id = ?'
    ).run('failed', now, message ?? 'Airtel disbursement failed', txn.id)

    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(
      nanoid(), txn.user_id, 'transfer_failed',
      'Transfer failed',
      `Your transfer to ${txn.recipient_name} could not be completed via Airtel Money. Our team will investigate.`
    )
  }

  return NextResponse.json({ ok: true })
}
