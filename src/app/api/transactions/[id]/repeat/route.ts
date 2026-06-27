import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import type { Transaction } from '@/lib/db'

type ExchangeRateRow = { rate: number; margin: number }

const NON_REPEATABLE: Record<string, string> = {
  pending: 'This transfer is still pending and cannot be repeated.',
  processing: 'This transfer is still processing and cannot be repeated.',
  failed: 'This transfer cannot be repeated.',
  cancelled: 'This transfer cannot be repeated.',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const txn = db.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?'
  ).get(id, user.id) as Transaction | undefined

  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (txn.status !== 'completed') {
    return NextResponse.json({
      ok: false,
      reason: NON_REPEATABLE[txn.status] ?? 'This transfer cannot be repeated.',
    })
  }

  let details: Record<string, string> = {}
  try { details = JSON.parse(txn.recipient_details ?? '{}') } catch {}

  // Current live rate from DB
  const rateRow = db.prepare(
    'SELECT rate, margin FROM exchange_rates WHERE from_currency = ? AND to_currency = ?'
  ).get(txn.send_currency, txn.receive_currency) as ExchangeRateRow | undefined

  const currentRate = rateRow
    ? Math.round(rateRow.rate * (1 - rateRow.margin) * 1e6) / 1e6
    : null

  const warnings: string[] = []
  if (currentRate !== null) {
    const rateDrift = Math.abs(currentRate - txn.exchange_rate) / Math.max(txn.exchange_rate, 1)
    if (rateDrift > 0.001) {
      warnings.push('Exchange rate has changed since your last transfer.')
    }
  }

  return NextResponse.json({
    ok: true,
    prefill: {
      toCountryCode: txn.recipient_country ?? '',
      sendCurrency: txn.send_currency,
      deliveryMethod: txn.delivery_method ?? 'mobile_money',
      mobileProvider: details.provider ?? '',
      recipientName: txn.recipient_name ?? '',
      recipientPhone: details.phone ?? '',
      bankName: details.bankName ?? '',
      bankAccount: details.account ?? '',
      sendAmount: String(txn.send_amount),
      paymentMethod: txn.payment_method ?? 'card',
    },
    originalRate: txn.exchange_rate,
    originalFee: txn.fee,
    originalSendAmount: txn.send_amount,
    currentRate,
    warnings,
  })
}
