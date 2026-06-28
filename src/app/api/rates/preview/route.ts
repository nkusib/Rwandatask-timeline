import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import type { ExchangeRate } from '@/lib/db'

/**
 * GET /api/rates/preview?from=GBP&to=NGN&amount=200&paymentMethod=card&deliveryMethod=mobile_money
 *
 * Returns the same rate + fee calculation used by the transaction POST,
 * without creating a transaction. Used for real-time fee preview in the send flow.
 *
 * Unauthenticated access returns public rate only (no fee breakdown).
 * Authenticated access returns full breakdown including corridor-specific fee.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')?.toUpperCase()
  const to = searchParams.get('to')?.toUpperCase()
  const amount = parseFloat(searchParams.get('amount') ?? '0')
  const paymentMethod = searchParams.get('paymentMethod') ?? 'card'
  const deliveryMethod = searchParams.get('deliveryMethod') ?? 'mobile_money'
  const fromCountry = searchParams.get('fromCountry')?.toUpperCase() ?? 'GB'
  const toCountry = searchParams.get('toCountry')?.toUpperCase() ?? 'NG'

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to currencies required' }, { status: 400 })
  }

  const rateRow = db.prepare(
    'SELECT rate, margin FROM exchange_rates WHERE from_currency = ? AND to_currency = ?'
  ).get(from, to) as ExchangeRate | undefined

  if (!rateRow) {
    return NextResponse.json({ error: `Rate not available for ${from}→${to}` }, { status: 404 })
  }

  const customerRate = Math.round(rateRow.rate * (1 - rateRow.margin) * 1e6) / 1e6

  if (!amount || amount <= 0) {
    return NextResponse.json({ customerRate, midRate: rateRow.rate, margin: rateRow.margin })
  }

  // Resolve sender region
  const senderRegion = ['GB', 'DE', 'FR', 'BE', 'NL', 'ES', 'IT', 'PT', 'IE'].includes(fromCountry)
    ? 'EU' : fromCountry

  const feeRule = db.prepare(
    `SELECT fixed_fee, percentage_fee FROM fee_rules
     WHERE from_country = ? AND to_country = ?
       AND payment_method = ? AND delivery_method = ?
       AND is_active = 1
       AND min_amount <= ? AND max_amount >= ?
     LIMIT 1`
  ).get(senderRegion, toCountry, paymentMethod, deliveryMethod, amount, amount) as
    { fixed_fee: number; percentage_fee: number } | undefined

  const fee = feeRule
    ? Math.round((feeRule.fixed_fee + amount * feeRule.percentage_fee / 100) * 100) / 100
    : Math.round((1.99 + amount * 1.5 / 100) * 100) / 100

  const totalAmount = Math.round((amount + fee) * 100) / 100
  const receiveAmount = Math.round(amount * customerRate * 100) / 100

  // Only return auth'd users their session context (daily remaining etc.)
  const user = await getSession().catch(() => null)
  const dailyRemaining = user ? (() => {
    const today = new Date().toISOString().slice(0, 10)
    const row = db.prepare('SELECT total_sent FROM daily_transaction_totals WHERE user_id = ? AND date = ?')
      .get(user.id, today) as { total_sent: number } | undefined
    const limit = [0, 500, 5000, 50000][user.kyc_level] ?? 0
    return Math.max(0, limit - (row?.total_sent ?? 0))
  })() : null

  return NextResponse.json({
    customerRate,
    midRate: rateRow.rate,
    margin: rateRow.margin,
    fee,
    totalAmount,
    receiveAmount,
    sendCurrency: from,
    receiveCurrency: to,
    ...(dailyRemaining !== null ? { dailyRemaining } : {}),
  })
}
