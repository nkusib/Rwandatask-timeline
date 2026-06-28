import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyBearerToken } from '@/lib/webhook-verify'
import { nanoid } from 'nanoid'

/**
 * M-Pesa B2C Result URL — fires when a BusinessPayment settles.
 * Safaricom authenticates by requiring your result URL to be HTTPS and by
 * sending a Bearer token you configured when registering the URL.
 * Set MPESA_RESULT_TOKEN to the secret you registered with Safaricom.
 *
 * Payload schema: https://developer.safaricom.co.ke/Documentation
 * {
 *   "Result": {
 *     "ResultCode": 0,  // 0 = success
 *     "ResultDesc": "...",
 *     "OriginatorConversationID": "RF...",
 *     "ConversationID": "AG...",
 *     "TransactionID": "LGR...",
 *     "ResultParameters": { "ResultParameter": [...] }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const auth = req.headers.get('authorization')

  const { ok, reason } = verifyBearerToken(auth, process.env.MPESA_RESULT_TOKEN)
  if (!ok) {
    console.warn('[mpesa-result] Rejected:', reason)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = payload?.Result
  if (!result) {
    return NextResponse.json({ error: 'Missing Result object' }, { status: 400 })
  }

  const {
    ResultCode,
    ResultDesc,
    OriginatorConversationID,
    ConversationID,
    TransactionID,
  } = result

  // M-Pesa puts our reference in OriginatorConversationID (set as RF_<timestamp>)
  const txn = db.prepare(
    'SELECT id, user_id, receive_amount, receive_currency, recipient_name, status FROM transactions WHERE provider_reference = ? OR reference = ?'
  ).get(ConversationID, OriginatorConversationID) as {
    id: string; user_id: string; receive_amount: number; receive_currency: string; recipient_name: string; status: string
  } | undefined

  if (!txn) {
    console.warn('[mpesa-result] Unknown conversation:', ConversationID, OriginatorConversationID)
    // Acknowledge to prevent retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  if (txn.status === 'completed' || txn.status === 'failed') {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const now = Math.floor(Date.now() / 1000)

  if (ResultCode === 0) {
    db.prepare(
      'UPDATE transactions SET status = ?, provider_reference = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    ).run('completed', TransactionID ?? ConversationID, now, now, txn.id)

    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(
      nanoid(), txn.user_id, 'transfer_complete',
      'Transfer completed!',
      `Your transfer of ${txn.receive_currency} ${txn.receive_amount} to ${txn.recipient_name} has been delivered via M-Pesa.`
    )
  } else {
    db.prepare(
      'UPDATE transactions SET status = ?, updated_at = ?, notes = ? WHERE id = ?'
    ).run('failed', now, ResultDesc ?? 'M-Pesa payment failed', txn.id)

    db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(
      nanoid(), txn.user_id, 'transfer_failed',
      'Transfer failed',
      `Your transfer to ${txn.recipient_name} could not be completed via M-Pesa (code: ${ResultCode}). Our team will investigate.`
    )
  }

  // M-Pesa expects this exact response shape
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
