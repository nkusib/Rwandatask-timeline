import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import {
  ArrowLeft, User, Shield, Bell, CreditCard, LogOut, ChevronRight,
  Home, Send, Users, BarChart2,
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home, label: 'Home', href: '/dashboard', key: 'home' },
  { icon: Send, label: 'Send', href: '/send', key: 'send' },
  { icon: Users, label: 'Recipients', href: '/recipients', key: 'recipients' },
  { icon: BarChart2, label: 'Rates', href: '/send', key: 'rates' },
  { icon: User, label: 'Profile', href: '/settings', key: 'profile' },
]

export default async function SettingsPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const kycBadge = {
    unverified: { label: 'Not verified', cls: 'text-amber-400' },
    pending: { label: 'In review', cls: 'text-blue-400' },
    verified: { label: 'Verified ✓', cls: 'text-emerald-400' },
    rejected: { label: 'Rejected', cls: 'text-red-400' },
  }[user.kyc_status] ?? { label: 'Unknown', cls: 'text-white/40' }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#080706' }}>

      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(8,7,6,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-white">Settings</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Profile card */}
        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1326FD] flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white text-lg">{user.name}</div>
              <div className="text-sm text-white/50">{user.email}</div>
              {user.phone && <div className="text-sm text-white/40">{user.phone}</div>}
            </div>
          </div>
        </div>

        {/* Settings items */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <Link href="/verify" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(19,38,253,0.25)' }}>
              <Shield className="w-4 h-4 text-[#7B8CFF]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white text-sm">Identity verification</div>
              <div className={`text-xs ${kycBadge.cls}`}>{kycBadge.label}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25" />
          </Link>

          <Link href="/recipients" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }}>
              <User className="w-4 h-4 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white text-sm">Saved recipients</div>
              <div className="text-xs text-white/40">Manage your recipients</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25" />
          </Link>

          <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(247,144,9,0.20)' }}>
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white text-sm">Notifications</div>
              <div className="text-xs text-white/40">Email &amp; push notifications</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25" />
          </div>

          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,143,90,0.20)' }}>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white text-sm">Payment methods</div>
              <div className="text-xs text-white/40">Manage cards and bank accounts</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/25" />
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-3xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <h3 className="font-bold text-white text-sm">Account information</h3>
          <div className="flex justify-between text-sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <span className="text-white/40">Country</span>
            <span className="font-medium text-white">{user.country}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <span className="text-white/40">KYC level</span>
            <span className="font-medium text-white">Level {user.kyc_level}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Member since</span>
            <span className="font-medium text-white">{new Date(user.created_at * 1000).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Sign out */}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-red-400 hover:text-red-300 transition-colors"
            style={{ background: 'rgba(217,45,32,0.12)', border: '1px solid rgba(217,45,32,0.20)' }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </main>

      {/* Floating bottom nav */}
      <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
        <div className="rounded-full flex items-center justify-around py-3 px-4 glass-pill-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, href, key }) => {
            const isActive = key === 'profile'
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
