import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import { validateAmount, validateCurrency, sanitizeString } from '@/lib/validation'
import { nanoid } from 'nanoid'
import type { ExchangeRate } from '@/lib/db'

// KYC daily limits in GBP-equivalent
const KYC_DAILY_LIMITS: Record<number, number> = {
  0: 0,
  1: 500,
  2: 5000,
  3: 50000,
}

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const txns = db.prepare(
    `SELECT id, type, status, send_amount, send_currency, receive_amount, receive_currency,
            exchange_rate, fee, total_amount, payment_method, delivery_method,
            recipient_name, recipient_country, reference, estimated_delivery,
            completed_at, created_at
     FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(user.id)

  return NextResponse.json(txns)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'

  // Rate limit: 5 transfers per 10 minutes per user
  const limit = rateLimit(`txn:${user.id}`, 5, 10 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json({ error: limit.error, retryAfter: limit.retryAfter }, { status: 429 })
  }

  // KYC check: must be at least level 1
  if (user.kyc_level < 1 || user.kyc_status !== 'verified') {
    return NextResponse.json(
      { error: 'Identity verification required before sending money.', code: 'KYC_REQUIRED' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()

    let sendAmount: number, sendCurrency: string, receiveCurrency: string
    try {
      sendAmount = validateAmount(body.sendAmount)
      sendCurrency = validateCurrency(body.sendCurrency)
      receiveCurrency = validateCurrency(body.receiveCurrency)
    } catch (e: any) {
      return NextResponse.json({ error: e.message, field: e.field }, { status: 400 })
    }

    const paymentMethod = sanitizeString(body.paymentMethod, 50)
    const deliveryMethod = sanitizeString(body.deliveryMethod, 50)
    const recipientName = sanitizeString(body.recipientName, 100)
    const recipientCountry = sanitizeString(body.recipientCountry, 2).toUpperCase()
    const recipientDetails = sanitizeString(JSON.stringify(body.recipientDetails || {}), 1000)

    // === SERVER-SIDE EXCHANGE RATE LOOKUP ===
    const rateRow = db.prepare(
      'SELECT rate, margin FROM exchange_rates WHERE from_currency = ? AND to_currency = ?'
    ).get(sendCurrency, receiveCurrency) as ExchangeRate | undefined

    if (!rateRow) {
      return NextResponse.json(
        { error: `Exchange rate not available for ${sendCurrency} → ${receiveCurrency}` },
        { status: 422 }
      )
    }

    // Apply margin: customer rate = mid rate * (1 - margin)
    const customerRate = Math.round(rateRow.rate * (1 - rateRow.margin) * 1e6) / 1e6

    // === SERVER-SIDE FEE CALCULATION ===
    // Map recipient country to fee_rules region
    const regionMap: Record<string, string> = {
      NG: 'NG', KE: 'KE', GH: 'GH', TZ: 'TZ', UG: 'UG', ZA: 'ZA',
    }
    const senderRegion = ['GB','DE','FR','BE','NL','ES','IT','PT','IE'].includes(user.country) ? 'EU' : user.country
    const recipientRegion = regionMap[recipientCountry] || recipientCountry

    const feeRule = db.prepare(
      `SELECT fixed_fee, percentage_fee FROM fee_rules
       WHERE from_country = ? AND to_country = ?
         AND payment_method = ? AND delivery_method = ?
         AND is_active = 1
         AND min_amount <= ? AND max_amount >= ?
       LIMIT 1`
    ).get(senderRegion, recipientRegion, paymentMethod, deliveryMethod, sendAmount, sendAmount) as
      { fixed_fee: number; percentage_fee: number } | undefined

    // Default fee if no rule found
    const fee = feeRule
      ? Math.round((feeRule.fixed_fee + sendAmount * feeRule.percentage_fee / 100) * 100) / 100
      : Math.round((1.99 + sendAmount * 1.5 / 100) * 100) / 100

    const totalAmount = Math.round((sendAmount + fee) * 100) / 100
    const receiveAmount = Math.round(sendAmount * customerRate * 100) / 100

    // === DAILY LIMIT CHECK ===
    const today = new Date().toISOString().slice(0, 10)

    // Convert to GBP for limit comparison
    const gbpRate = sendCurrency === 'GBP' ? 1 :
      (db.prepare('SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ?')
        .get(sendCurrency, 'GBP') as { rate: number } | undefined)?.rate || 1

    const gbpEquivalent = sendAmount / gbpRate
    const dailyLimit = KYC_DAILY_LIMITS[user.kyc_level] ?? 0

    const todayRow = db.prepare(
      'SELECT total_sent FROM daily_transaction_totals WHERE user_id = ? AND date = ?'
    ).get(user.id, today) as { total_sent: number } | undefined

    const todaySentGbp = todayRow?.total_sent || 0

    if (todaySentGbp + gbpEquivalent > dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily limit of £${dailyLimit} exceeded. Used: £${Math.round(todaySentGbp)}, requested: £${Math.round(gbpEquivalent)}.`,
          code: 'DAILY_LIMIT_EXCEEDED',
          upgradeUrl: '/verify',
        },
        { status: 403 }
      )
    }

    const id = nanoid()
    const reference = `RF${Date.now().toString(36).toUpperCase()}`
    const estimatedDelivery = deliveryMethod === 'mobile_money' ? 'Under 30 minutes' : '1-2 business hours'

    // Insert transaction
    db.prepare(`
      INSERT INTO transactions (
        id, user_id, type, status, send_amount, send_currency,
        receive_amount, receive_currency, exchange_rate, fee, total_amount,
        payment_method, delivery_method, recipient_name, recipient_country,
        recipient_details, reference, estimated_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, user.id, 'send', 'processing',
      sendAmount, sendCurrency,
      receiveAmount, receiveCurrency,
      customerRate, fee, totalAmount,
      paymentMethod, deliveryMethod,
      recipientName, recipientCountry,
      recipientDetails, reference, estimatedDelivery
    )

    // Update daily total
    db.prepare(`
      INSERT INTO daily_transaction_totals (user_id, date, total_sent)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET total_sent = total_sent + excluded.total_sent
    `).run(user.id, today, gbpEquivalent)

    // Simulate async completion via payment processor webhook (15s for demo)
    setTimeout(() => {
      try {
        db.prepare(
          'UPDATE transactions SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?'
        ).run('completed', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000), id)

        db.prepare(
          'INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
        ).run(
          nanoid(), user.id, 'transfer_complete',
          'Transfer completed!',
          `Your transfer of ${sendCurrency} ${sendAmount} to ${recipientName} is complete.`
        )
      } catch {}
    }, 15000)

    return NextResponse.json({
      id, reference, status: 'processing',
      receiveAmount, exchangeRate: customerRate, fee, totalAmount
    })
  } catch (err) {
    console.error('[transactions POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
