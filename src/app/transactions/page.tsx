import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Filter } from 'lucide-react'
import type { Transaction } from '@/lib/db'
import { CURRENCIES, TRANSACTION_STATUS_LABELS } from '@/lib/constants'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦', ET: '🇪🇹', ZM: '🇿🇲',
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function TransactionsPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const txns = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id) as Transaction[]

  const totalSent = txns.filter(t => t.status === 'completed').reduce((s, t) => s + t.send_amount, 0)
  const currency = txns[0]?.send_currency ?? 'GBP'
  const sym = CURRENCIES[currency as keyof typeof CURRENCIES]?.symbol ?? '£'

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Transfer history</span>
          <button className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {txns.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-[#1326FD] font-medium mb-0.5">Total sent (all time)</div>
              <div className="text-2xl font-bold text-slate-900">{sym}{totalSent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#1326FD]">{txns.length} transfers</div>
              <div className="text-xs text-[#1326FD]">{txns.filter(t => t.status === 'completed').length} completed</div>
            </div>
          </div>
        )}

        {txns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">💸</div>
            <div className="font-semibold text-gray-900 mb-1">No transfers yet</div>
            <div className="text-sm text-gray-500 mb-4">Your transfer history will appear here</div>
            <Link href="/send" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: '#1326FD' }}>
              Send money
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {txns.map(t => {
              const st = TRANSACTION_STATUS_LABELS[t.status]
              const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
              const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                  <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-xl shrink-0 border border-gray-100">
                      {t.recipient_country ? (COUNTRY_FLAGS[t.recipient_country] ?? '🌍') : '🌍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{t.recipient_name ?? 'Transfer'}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span>{timeAgo(t.created_at)}</span>
                        {t.delivery_method && (
                          <>
                            <span>·</span>
                            <span>{t.delivery_method === 'mobile_money' ? '📱 Mobile money' : '🏦 Bank'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-gray-900 text-sm">
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
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0D1DBD] text-xs font-semibold hover:bg-blue-100 transition-colors"
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
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-100 grid grid-cols-4 py-2 px-2">
        {[
          { icon: '🏠', label: 'Home', href: '/dashboard' },
          { icon: '💸', label: 'Send', href: '/send' },
          { icon: '📋', label: 'History', href: '/transactions' },
          { icon: '👤', label: 'Profile', href: '/settings' },
        ].map(n => (
          <Link key={n.label} href={n.href} className="flex flex-col items-center gap-0.5 py-1">
            <span className="text-xl">{n.icon}</span>
            <span className="text-xs text-gray-500">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
