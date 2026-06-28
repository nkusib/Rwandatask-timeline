import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Filter, Home, Send, Users, BarChart2, User } from 'lucide-react'
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

const NAV_ITEMS = [
  { icon: Home, label: 'Home', href: '/dashboard', key: 'home' },
  { icon: Send, label: 'Send', href: '/send', key: 'send' },
  { icon: Users, label: 'Recipients', href: '/recipients', key: 'recipients' },
  { icon: BarChart2, label: 'Rates', href: '/send', key: 'rates' },
  { icon: User, label: 'Profile', href: '/settings', key: 'profile' },
]

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
    <div className="min-h-screen pb-32" style={{ background: '#080706' }}>

      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(8,7,6,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-white flex-1">Transfer history</span>
          <button className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Summary card */}
        {txns.length > 0 && (
          <div className="rounded-3xl p-5 mb-4" style={{ background: 'rgba(19,38,253,0.20)', border: '1px solid rgba(19,38,253,0.30)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#7B8CFF] text-xs font-medium mb-1">Total sent (all time)</div>
                <div className="text-white font-bold text-2xl">{sym}{totalSent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="text-right">
                <div className="text-[#7B8CFF] text-sm font-semibold">{txns.length} transfers</div>
                <div className="text-white/40 text-xs">{txns.filter(t => t.status === 'completed').length} completed</div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction list */}
        {txns.length === 0 ? (
          <div className="rounded-3xl py-16 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-4xl mb-3">💸</div>
            <div className="font-semibold text-white/70 mb-1">No transfers yet</div>
            <div className="text-sm text-white/40 mb-5">Your transfer history will appear here</div>
            <Link href="/send" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold bg-[#1326FD] hover:bg-[#0D1DBD] transition-colors">
              Send money
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {txns.map((t, i) => {
              const st = TRANSACTION_STATUS_LABELS[t.status]
              const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
              const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-colors"
                  style={i < txns.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
                >
                  <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }}>
                      {t.recipient_country ? (COUNTRY_FLAGS[t.recipient_country] ?? '🌍') : '🌍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{t.recipient_name ?? 'Transfer'}</div>
                      <div className="text-xs text-white/40 flex items-center gap-2">
                        <span>{timeAgo(t.created_at)}</span>
                        {t.delivery_method && (
                          <>
                            <span>·</span>
                            <span>{t.delivery_method === 'mobile_money' ? '📱 Mobile' : '🏦 Bank'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-white text-sm">
                        -{sendCur?.symbol}{t.send_amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-white/40">
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
                        className="px-2.5 py-1 rounded-lg text-[#7B8CFF] text-xs font-semibold hover:text-white transition-colors"
                        style={{ background: 'rgba(19,38,253,0.20)' }}
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

      {/* Floating bottom nav */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="rounded-full flex items-center justify-around py-3 px-4 glass-pill-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, href, key }) => (
            <Link
              key={key}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-full text-white/45 hover:text-white/70 transition-colors"
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
