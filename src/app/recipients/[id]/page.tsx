import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Smartphone, Building2, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react'
import type { Recipient, Transaction } from '@/lib/db'
import { CURRENCIES, TRANSACTION_STATUS_LABELS } from '@/lib/constants'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦', ET: '🇪🇹', ZM: '🇿🇲',
}

const PROVIDER_NAMES: Record<string, string> = {
  mtn: 'MTN Mobile Money', mpesa: 'M-Pesa', airtel: 'Airtel Money',
  orange: 'Orange Money', wave: 'Wave', vodafone: 'Vodafone Cash', tigo: 'Tigo Cash',
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function RecipientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const recipient = db.prepare(
    'SELECT * FROM recipients WHERE id = ? AND user_id = ?'
  ).get(id, user.id) as Recipient | undefined

  if (!recipient) notFound()

  // Transactions matched by name + country (recipient_id not populated by current send flow)
  const txns = db.prepare(
    `SELECT * FROM transactions
     WHERE user_id = ? AND recipient_name = ? AND recipient_country = ?
     ORDER BY created_at DESC LIMIT 50`
  ).all(user.id, recipient.name, recipient.country) as Transaction[]

  const lastCompleted = txns.find(t => t.status === 'completed')

  const initials = recipient.name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Check if recipient details have drifted from last transaction
  let detailsChanged = false
  if (lastCompleted?.recipient_details) {
    try {
      const d = JSON.parse(lastCompleted.recipient_details)
      if (recipient.payment_method === 'mobile_money') {
        detailsChanged = !!(d.phone && recipient.mobile_number && d.phone !== recipient.mobile_number)
      } else {
        detailsChanged = !!(d.account && recipient.bank_account && d.account !== recipient.bank_account)
      }
    } catch {}
  }

  const maskedIdentifier = (() => {
    const raw = recipient.payment_method === 'mobile_money'
      ? recipient.mobile_number
      : (recipient.bank_account ?? recipient.iban ?? '')
    if (!raw) return null
    if (raw.length <= 4) return raw
    return '·'.repeat(raw.length - 4) + raw.slice(-4)
  })()

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/recipients" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Recipient</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Recipient profile card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
            style={{ backgroundColor: recipient.avatar_color ?? '#7c3aed' }}
          >
            {initials}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-0.5">{recipient.name}</h2>
          <div className="text-sm text-gray-500 flex items-center justify-center gap-1.5 mb-4">
            <span>{COUNTRY_FLAGS[recipient.country] ?? '🌍'}</span>
            <span>{recipient.country}</span>
          </div>

          {/* Payment rail */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-sm">
            {recipient.payment_method === 'mobile_money' ? (
              <>
                <Smartphone className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">
                  {PROVIDER_NAMES[recipient.mobile_provider ?? ''] ?? recipient.mobile_provider ?? 'Mobile Money'}
                </span>
                {maskedIdentifier && (
                  <><span className="text-gray-300">·</span><span className="text-gray-500 font-mono text-xs">{maskedIdentifier}</span></>
                )}
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-700">{recipient.bank_name ?? 'Bank transfer'}</span>
                {maskedIdentifier && (
                  <><span className="text-gray-300">·</span><span className="text-gray-500 font-mono text-xs">{maskedIdentifier}</span></>
                )}
              </>
            )}
          </div>
        </div>

        {/* Details changed warning */}
        {detailsChanged && (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Recipient details have changed since their last transfer. Please verify before sending.</span>
          </div>
        )}

        {/* Transfer history */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Transfer history
          </h3>
          {txns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="text-3xl mb-2">💸</div>
              <div className="text-sm font-medium text-gray-900 mb-1">No transfers yet</div>
              <div className="text-xs text-gray-500">Transfers to {recipient.name} will appear here</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {txns.map(t => {
                const st = TRANSACTION_STATUS_LABELS[t.status]
                const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
                const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{timeAgo(t.created_at)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {t.delivery_method === 'mobile_money' ? '📱 Mobile money' : '🏦 Bank'}
                          {t.payment_method && <span className="ml-1 capitalize">· {t.payment_method.replace('_', ' ')}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-900">
                          -{sendCur?.symbol}{t.send_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {recCur?.symbol}{Number(t.receive_amount).toLocaleString()} {t.receive_currency}
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st?.bg} ${st?.color}`}>
                        {st?.label}
                      </span>
                      {t.status === 'completed' && (
                        <Link
                          href={`/send?from_transaction=${t.id}`}
                          className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors"
                        >
                          Repeat
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {lastCompleted ? (
            <Link
              href={`/send?from_transaction=${lastCompleted.id}`}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Send again
            </Link>
          ) : (
            <Link
              href="/send"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
            >
              Send
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
