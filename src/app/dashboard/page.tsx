import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import {
  Bell, Settings, ChevronRight, TrendingUp, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Search, Users, MoreHorizontal,
  Home, Send, User, BarChart2, Plus,
} from 'lucide-react'
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

const NAV_ITEMS = [
  { icon: Home, label: 'Home', href: '/dashboard', key: 'home' },
  { icon: Send, label: 'Send', href: '/send', key: 'send' },
  { icon: Users, label: 'Recipients', href: '/recipients', key: 'recipients' },
  { icon: BarChart2, label: 'Rates', href: '/send', key: 'rates' },
  { icon: User, label: 'Profile', href: '/settings', key: 'profile' },
]

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')
  if (['admin', 'super_admin'].includes(user.role)) redirect('/admin')

  const wallets = db.prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY is_primary DESC').all(user.id) as Wallet[]
  const recentTxns = db.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(user.id) as Transaction[]

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

  return (
    <div className="min-h-screen pb-32" style={{ background: '#080706' }}>

      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-40 border-b" style={{ background: 'rgba(8,7,6,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1326FD] flex items-center justify-center font-bold text-xs text-white">RF</div>
            <span className="font-bold text-white">RemitFlow</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-white font-semibold">Home</Link>
            <Link href="/send" className="text-white/50 hover:text-white transition-colors">Send</Link>
            <Link href="/transactions" className="text-white/50 hover:text-white transition-colors">History</Link>
            <Link href="/recipients" className="text-white/50 hover:text-white transition-colors">Recipients</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Bell className="w-4 h-4" />
            </button>
            <Link href="/settings" className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Settings className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-full bg-[#1326FD] flex items-center justify-center text-white font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <div className="md:hidden px-5 pt-14 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1326FD] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 h-10 rounded-full flex items-center px-4 gap-2" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <Search className="w-4 h-4 text-white/30" />
          <span className="text-white/30 text-sm">Search</span>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/60" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <Bell className="w-4 h-4" />
        </button>
        <Link href="/settings" className="w-10 h-10 rounded-full flex items-center justify-center text-white/60" style={{ background: 'rgba(255,255,255,0.10)' }}>
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-5">

        {/* Balance area */}
        <div className="text-center pt-6 pb-8">
          <div className="text-white/40 text-sm mb-3 tracking-wide uppercase text-xs font-medium">
            Personal · {primaryWallet?.currency ?? 'GBP'}
          </div>
          <div className="font-bold text-white mb-1" style={{ fontSize: 'clamp(42px,10vw,64px)', lineHeight: '1.05', letterSpacing: '-0.03em' }}>
            {primaryWallet ? formatAmount(primaryWallet.balance, primaryWallet.currency) : '£0.00'}
          </div>
          <div className="text-white/35 text-sm mb-5">Available balance</div>
          <button className="px-5 py-2 rounded-full text-sm font-medium text-white/70 transition-colors hover:text-white/90" style={{ background: 'rgba(255,255,255,0.10)' }}>
            Accounts &amp; wallets ›
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex justify-around pb-8 max-w-sm mx-auto">
          {[
            { Icon: ArrowDownLeft, label: 'Add money', href: '#' },
            { Icon: ArrowUpRight, label: 'Send', href: '/send' },
            { Icon: Users, label: 'Recipients', href: '/recipients' },
            { Icon: MoreHorizontal, label: 'More', href: '#' },
          ].map(({ Icon, label, href }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-2.5 group">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all group-hover:scale-105" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-white/50 group-hover:text-white/80 transition-colors">{label}</span>
            </Link>
          ))}
        </div>

        {/* EDD banner */}
        {userExtra?.edd_required === 1 && userExtra.edd_deadline && (() => {
          const daysLeft = Math.max(0, Math.ceil((userExtra.edd_deadline - Date.now() / 1000) / 86400))
          const isUrgent = daysLeft <= 7
          return (
            <div className={`mb-4 p-4 rounded-2xl flex items-center justify-between gap-4 ${isUrgent ? 'bg-red-500/15 border border-red-500/25' : 'bg-amber-500/15 border border-amber-500/25'}`}>
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-5 h-5 shrink-0 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
                <div>
                  <div className={`font-semibold text-sm ${isUrgent ? 'text-red-300' : 'text-amber-300'}`}>Additional verification required</div>
                  <div className={`text-xs opacity-80 mt-0.5 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
                    Upload proof of address · <strong>{daysLeft}d remaining</strong>
                  </div>
                </div>
              </div>
              <Link href="/verify/edd" className="shrink-0 px-3 py-1.5 rounded-xl text-white font-semibold text-xs whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.15)' }}>
                Upload →
              </Link>
            </div>
          )
        })()}

        {/* KYC banner */}
        {user.kyc_status !== 'verified' && (
          <div className={`mb-4 p-4 rounded-2xl flex items-center justify-between gap-4 ${
            user.kyc_status === 'rejected' ? 'bg-red-500/15 border border-red-500/25' :
            user.kyc_status === 'pending' ? 'bg-blue-500/15 border border-blue-500/25' :
            'bg-amber-500/15 border border-amber-500/25'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-5 h-5 shrink-0 ${
                user.kyc_status === 'rejected' ? 'text-red-400' :
                user.kyc_status === 'pending' ? 'text-blue-400' : 'text-amber-400'
              }`} />
              <div>
                <div className={`font-semibold text-sm ${
                  user.kyc_status === 'rejected' ? 'text-red-300' :
                  user.kyc_status === 'pending' ? 'text-blue-300' : 'text-amber-300'
                }`}>
                  {user.kyc_status === 'unverified' ? 'Verify to unlock higher limits' :
                   user.kyc_status === 'pending' ? 'Verification in progress' :
                   'Verification rejected — resubmit'}
                </div>
                {user.kyc_status === 'unverified' && weeklyPreKyc > 0 && (
                  <div className="text-xs text-amber-400/80 mt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>£{weeklyPreKyc.toFixed(0)}/£50 weekly limit used</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.10)' }}>
                      <div className={`h-full rounded-full ${weeklyPreKyc >= 45 ? 'bg-red-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, (weeklyPreKyc / 50) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {(user.kyc_status === 'unverified' || user.kyc_status === 'rejected') && (
              <Link href="/verify" className="shrink-0 px-3 py-1.5 rounded-xl text-white font-semibold text-xs whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.15)' }}>
                Verify →
              </Link>
            )}
          </div>
        )}

        {/* Stats card */}
        <div className="mb-4 p-5 rounded-3xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-white/40 text-xs mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> This month</div>
              <div className="text-white font-bold text-lg">{formatAmount(totalSentThisMonth, primaryWallet?.currency ?? 'GBP')}</div>
              <div className="text-white/30 text-xs">sent</div>
            </div>
            <div>
              <div className="text-white/40 text-xs mb-1">Transfers</div>
              <div className="text-white font-bold text-lg">{recentTxns.filter(t => t.status === 'completed').length}</div>
              <div className="text-white/30 text-xs">completed</div>
            </div>
            <div>
              <div className="text-white/40 text-xs mb-1">Pending</div>
              <div className="text-white font-bold text-lg">{pendingCount}</div>
              <div className="text-white/30 text-xs">in progress</div>
            </div>
          </div>
        </div>

        {/* Quick send to countries */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { flag: '🇳🇬', label: 'Nigeria', href: '/send?to=NG' },
            { flag: '🇰🇪', label: 'Kenya', href: '/send?to=KE' },
            { flag: '🇬🇭', label: 'Ghana', href: '/send?to=GH' },
            { flag: '🌍', label: 'All countries', href: '/send' },
          ].map(a => (
            <Link key={a.label} href={a.href} className="flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-medium text-white/70 hover:text-white/90 transition-colors shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <span className="text-base">{a.flag}</span>
              {a.label}
            </Link>
          ))}
        </div>

        {/* Recent transfers */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="font-semibold text-white text-sm">Recent activity</span>
            <Link href="/transactions" className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-4xl mb-3">💸</div>
              <div className="font-semibold text-white/70 mb-1">No transfers yet</div>
              <div className="text-sm text-white/40 mb-5">Send money to your first recipient</div>
              <Link href="/send" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold bg-[#1326FD] hover:bg-[#0D1DBD] transition-colors">
                <Plus className="w-4 h-4" /> Send money
              </Link>
            </div>
          ) : (
            <div>
              {recentTxns.map((t, i) => {
                const st = TRANSACTION_STATUS_LABELS[t.status]
                const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
                const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
                return (
                  <Link
                    href={`/transactions/${t.id}`}
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors"
                    style={i < recentTxns.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }}>
                      {t.recipient_country ? (COUNTRY_FLAGS[t.recipient_country] ?? '🌍') : '🌍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{t.recipient_name ?? 'Transfer'}</div>
                      <div className="text-xs text-white/40">{timeAgo(t.created_at)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-white text-sm">
                        -{sendCur?.symbol}{t.send_amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-white/40">
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
      </div>

      {/* Floating bottom nav */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="rounded-full flex items-center justify-around py-3 px-4 glass-pill-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, href, key }) => {
            const isActive = key === 'home'
            return (
              <Link
                key={key}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${isActive ? 'text-white' : 'text-white/45 hover:text-white/70'}`}
                style={isActive ? { background: 'rgba(255,255,255,0.15)' } : {}}
              >
                <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
