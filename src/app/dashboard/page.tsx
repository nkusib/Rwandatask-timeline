import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Bell, Settings, ChevronRight, TrendingUp, Clock, AlertCircle, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'
import type { Transaction, Wallet } from '@/lib/db'
import { CURRENCIES, TRANSACTION_STATUS_LABELS } from '@/lib/constants'

function formatAmount(amount: number, currency: string) {
  const cur = CURRENCIES[currency as keyof typeof CURRENCIES]
  return `${cur?.symbol ?? ''}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦',
  ET: '🇪🇹', ZM: '🇿🇲',
}

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')
  if (['admin', 'super_admin'].includes(user.role)) redirect('/admin')

  const wallets = db.prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY is_primary DESC').all(user.id) as Wallet[]
  const recentTxns = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(user.id) as Transaction[]

  // EDD status and pre-KYC weekly usage
  const userExtra = db.prepare(
    'SELECT edd_required, edd_deadline FROM users WHERE id = ?'
  ).get(user.id) as { edd_required: number; edd_deadline: number | null } | undefined

  const monday = new Date()
  monday.setDate(monday.getDate() - monday.getDay() + (monday.getDay() === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)
  const weekStartTs = Math.floor(monday.getTime() / 1000)

  const weeklyPreKyc = user.kyc_level < 1 ? (db.prepare(
    `SELECT COALESCE(SUM(send_amount / CASE send_currency
       WHEN 'GBP' THEN 1 WHEN 'EUR' THEN 1.17 WHEN 'USD' THEN 0.79 ELSE 0.79 END), 0) as total_gbp
     FROM transactions WHERE user_id = ? AND created_at >= ? AND status != 'cancelled'`
  ).get(user.id, weekStartTs) as { total_gbp: number })?.total_gbp ?? 0 : 0

  const primaryWallet = wallets.find(w => w.is_primary) ?? wallets[0]
  const totalSentThisMonth = recentTxns
    .filter(t => t.status === 'completed' && t.created_at > Date.now() / 1000 - 2592000)
    .reduce((s, t) => s + t.send_amount, 0)
  const pendingCount = recentTxns.filter(t => ['pending', 'processing'].includes(t.status)).length

  const kycClass = {
    unverified: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }[user.kyc_status] ?? 'bg-gray-100 text-gray-700 border-gray-200'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#191C1F] flex items-center justify-center font-bold text-xs text-white">RF</div>
            <span className="font-bold text-gray-900">RemitFlow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-[#0070F3] font-semibold">Home</Link>
            <Link href="/send" className="text-gray-600 hover:text-gray-900">Send</Link>
            <Link href="/transactions" className="text-gray-600 hover:text-gray-900">History</Link>
            <Link href="/recipients" className="text-gray-600 hover:text-gray-900">Recipients</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
              <Bell className="w-5 h-5" />
            </button>
            <Link href="/settings" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
              <Settings className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-full bg-[#191C1F] flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* EDD (Enhanced Due Diligence) banner — highest priority */}
        {userExtra?.edd_required === 1 && userExtra.edd_deadline && (() => {
          const daysLeft = Math.max(0, Math.ceil((userExtra.edd_deadline - Date.now() / 1000) / 86400))
          const isUrgent = daysLeft <= 7
          return (
            <div className={`mb-5 p-4 rounded-xl border flex items-center justify-between gap-4 ${isUrgent ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Additional verification required</div>
                  <div className="text-xs opacity-80">
                    Please upload a proof of address (utility bill or bank statement dated within 3 months).{' '}
                    <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining.</strong>
                    {daysLeft <= 7 && ' Transfers will be suspended if not submitted.'}
                  </div>
                </div>
              </div>
              <Link href="/verify/edd" className="shrink-0 px-4 py-2 rounded-lg bg-white font-semibold text-sm shadow-sm hover:shadow transition-all whitespace-nowrap">
                Upload now →
              </Link>
            </div>
          )
        })()}

        {/* KYC status banner */}
        {user.kyc_status !== 'verified' && (
          <div className={`mb-5 p-4 rounded-xl border flex items-center justify-between gap-4 ${kycClass}`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-semibold text-sm">
                  {user.kyc_status === 'unverified' ? 'Unlock higher limits — verify your identity' :
                   user.kyc_status === 'pending' ? 'Verification in progress — usually 1-2 hours' :
                   'Verification rejected — please resubmit'}
                </div>
                {user.kyc_status === 'unverified' && (
                  <div className="text-xs opacity-75">
                    Weekly allowance: £{weeklyPreKyc.toFixed(0)}/£50 used · Verify to unlock up to £5,000/day
                  </div>
                )}
              </div>
            </div>
            {(user.kyc_status === 'unverified' || user.kyc_status === 'rejected') && (
              <Link href="/verify" className="shrink-0 px-4 py-2 rounded-lg bg-white font-semibold text-sm shadow-sm hover:shadow transition-all whitespace-nowrap">
                Verify now →
              </Link>
            )}
          </div>
        )}

        {/* Pre-KYC weekly usage progress bar */}
        {user.kyc_status === 'unverified' && weeklyPreKyc > 0 && (
          <div className="mb-5 bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">Weekly allowance (unverified)</span>
              <span className="text-xs font-bold text-gray-900">£{weeklyPreKyc.toFixed(2)} / £50</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${weeklyPreKyc >= 45 ? 'bg-red-400' : weeklyPreKyc >= 30 ? 'bg-amber-400' : 'bg-[#0070F3]'}`}
                style={{ width: `${Math.min(100, (weeklyPreKyc / 50) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Resets every Monday · <Link href="/verify" className="text-[#0070F3] hover:underline">Verify ID to remove this limit</Link></p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-5">
          <div className="md:col-span-2 rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A5C)' }}>
            <div className="text-white/70 text-sm mb-1">Good {greeting}, {user.name.split(' ')[0]}</div>
            {primaryWallet ? (
              <>
                <div className="text-3xl font-bold mb-0.5">{formatAmount(primaryWallet.balance, primaryWallet.currency)}</div>
                <div className="text-white/60 text-xs">{primaryWallet.currency} Balance</div>
              </>
            ) : (
              <div className="text-2xl font-bold mb-0.5">—</div>
            )}
            <div className="mt-4 flex gap-3">
              <Link href="/send" className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
                <ArrowUpRight className="w-4 h-4" /> Send
              </Link>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
                <ArrowDownLeft className="w-4 h-4" /> Top up
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5" /> Sent this month
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatAmount(totalSentThisMonth, primaryWallet?.currency ?? 'GBP')}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Clock className="w-3.5 h-3.5" /> Pending transfers
              </div>
              <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: '🇳🇬', label: 'To Nigeria', href: '/send?to=NG' },
            { icon: '🇰🇪', label: 'To Kenya', href: '/send?to=KE' },
            { icon: '🇬🇭', label: 'To Ghana', href: '/send?to=GH' },
            { icon: '🌍', label: 'More', href: '/send' },
          ].map(a => (
            <Link key={a.label} href={a.href} className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all text-center">
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="text-xs font-medium text-gray-700">{a.label}</div>
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Recent transfers</h2>
            <Link href="/transactions" className="text-sm text-[#0070F3] hover:underline font-medium flex items-center gap-1">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💸</div>
              <div className="font-semibold text-gray-900 mb-1">No transfers yet</div>
              <div className="text-sm text-gray-500 mb-4">Send money to your first recipient</div>
              <Link href="/send" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #191C1F, #0F3460)' }}>
                <Plus className="w-4 h-4" /> Send money
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTxns.map(t => {
                const st = TRANSACTION_STATUS_LABELS[t.status]
                const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
                const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
                return (
                  <Link href={`/transactions/${t.id}`} key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-lg shrink-0">
                      {t.recipient_country ? (COUNTRY_FLAGS[t.recipient_country] ?? '🌍') : '🌍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{t.recipient_name ?? 'Transfer'}</div>
                      <div className="text-xs text-gray-500">{timeAgo(t.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-gray-900 text-sm">
                        -{sendCur?.symbol}{t.send_amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {recCur?.symbol}{t.receive_amount.toLocaleString()} {t.receive_currency}
                      </div>
                    </div>
                    <span className={`ml-1 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${st?.bg} ${st?.color}`}>
                      {st?.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
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
