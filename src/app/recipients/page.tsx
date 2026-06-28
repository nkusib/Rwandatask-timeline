import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Plus, Smartphone, Building2 } from 'lucide-react'
import type { Recipient } from '@/lib/db'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦', ET: '🇪🇹', ZM: '🇿🇲',
}

export default async function RecipientsPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const recipients = db.prepare(
    'SELECT * FROM recipients WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id) as Recipient[]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Recipients</span>
          <Link href="/send" className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#161618] text-white text-sm font-semibold hover:bg-[#0D1DBD] transition-colors">
            <Plus className="w-4 h-4" /> Add
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {recipients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <div className="font-semibold text-gray-900 mb-1">No recipients yet</div>
            <div className="text-sm text-gray-500 mb-4">Recipients are saved automatically when you send money</div>
            <Link href="/send" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: '#1326FD' }}>
              <Plus className="w-4 h-4" /> Send money
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {recipients.map(r => (
              <Link key={r.id} href={`/recipients/${r.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: r.avatar_color ?? '#1326FD' }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{r.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span>{COUNTRY_FLAGS[r.country] ?? '🌍'} {r.country}</span>
                    {r.payment_method === 'mobile_money' ? (
                      <><span>·</span><Smartphone className="w-3 h-3" /><span>{r.mobile_provider}</span></>
                    ) : (
                      <><span>·</span><Building2 className="w-3 h-3" /><span>{r.bank_name}</span></>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#0D1DBD] text-xs font-semibold">
                  View
                </span>
              </Link>
            ))}
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
