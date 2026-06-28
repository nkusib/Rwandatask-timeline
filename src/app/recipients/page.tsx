import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Plus, Smartphone, Building2, Home, Send, Users, BarChart2, User } from 'lucide-react'
import type { Recipient } from '@/lib/db'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦', ET: '🇪🇹', ZM: '🇿🇲',
}

const NAV_ITEMS = [
  { icon: Home, label: 'Home', href: '/dashboard', key: 'home' },
  { icon: Send, label: 'Send', href: '/send', key: 'send' },
  { icon: Users, label: 'Recipients', href: '/recipients', key: 'recipients' },
  { icon: BarChart2, label: 'Rates', href: '/send', key: 'rates' },
  { icon: User, label: 'Profile', href: '/settings', key: 'profile' },
]

export default async function RecipientsPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const recipients = db.prepare(
    'SELECT * FROM recipients WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id) as Recipient[]

  return (
    <div className="min-h-screen pb-32" style={{ background: '#080706' }}>

      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(8,7,6,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-white flex-1">Recipients</span>
          <Link
            href="/send"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: '#1326FD' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </Link>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {recipients.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl py-16 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(19,38,253,0.20)' }}>
              <Users className="w-7 h-7 text-[#7B8CFF]" />
            </div>
            <div className="font-bold text-white mb-1">No recipients yet</div>
            <div className="text-sm text-white/40 mb-6 max-w-xs mx-auto">
              Recipients are saved automatically when you send money, or you can add one now.
            </div>
            <Link
              href="/send"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#1326FD' }}
            >
              <Send className="w-4 h-4" />
              Send your first transfer
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {recipients.map((r, i) => (
              <Link
                key={r.id}
                href={`/recipients/${r.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors"
                style={i < recipients.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                  style={{ background: r.avatar_color ?? '#1326FD' }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{r.name}</div>
                  <div className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                    <span>{COUNTRY_FLAGS[r.country] ?? '🌍'} {r.country}</span>
                    {r.payment_method === 'mobile_money' ? (
                      <><span>·</span><Smartphone className="w-3 h-3" /><span>{r.mobile_provider}</span></>
                    ) : (
                      <><span>·</span><Building2 className="w-3 h-3" /><span>{r.bank_name ?? 'Bank'}</span></>
                    )}
                  </div>
                </div>
                <Link
                  href={`/send?recipient=${r.id}`}
                  className="px-3 py-1.5 rounded-lg text-[#7B8CFF] text-xs font-semibold hover:text-white transition-colors shrink-0"
                  style={{ background: 'rgba(19,38,253,0.20)' }}
                  onClick={e => e.stopPropagation()}
                >
                  Send
                </Link>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Floating bottom nav */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="rounded-full flex items-center justify-around py-3 px-4 glass-pill-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, href, key }) => {
            const isActive = key === 'recipients'
            return (
              <Link
                key={key}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${isActive ? 'text-white' : 'text-white/45 hover:text-white/70'}`}
                style={isActive ? { background: 'rgba(255,255,255,0.15)' } : {}}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
