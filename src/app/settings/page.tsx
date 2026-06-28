import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft, User, Shield, Bell, CreditCard, LogOut, ChevronRight } from 'lucide-react'

export default async function SettingsPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const kycBadge = {
    unverified: { label: 'Not verified', cls: 'text-red-600' },
    pending: { label: 'In review', cls: 'text-amber-600' },
    verified: { label: 'Verified ✓', cls: 'text-emerald-600' },
    rejected: { label: 'Rejected', cls: 'text-red-600' },
  }[user.kyc_status] ?? { label: 'Unknown', cls: 'text-gray-600' }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Settings</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ background: 'linear-gradient(135deg, #191C1F, #0F3460)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-lg">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
              {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <Link href="/verify" className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#0070F3]" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Identity verification</div>
              <div className={`text-xs ${kycBadge.cls}`}>{kycBadge.label}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link href="/recipients" className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Saved recipients</div>
              <div className="text-xs text-gray-400">Manage your recipients</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>

          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Notifications</div>
              <div className="text-xs text-gray-400">Email &amp; push notifications</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Payment methods</div>
              <div className="text-xs text-gray-400">Manage cards and bank accounts</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3 text-sm">
          <h3 className="font-bold text-gray-900">Account information</h3>
          <div className="flex justify-between">
            <span className="text-gray-500">Country</span>
            <span className="font-medium text-gray-900">{user.country}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">KYC level</span>
            <span className="font-medium text-gray-900">Level {user.kyc_level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="font-medium text-gray-900">{new Date(user.created_at * 1000).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
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
