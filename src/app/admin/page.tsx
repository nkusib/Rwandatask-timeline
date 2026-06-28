import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Users, TrendingUp, AlertCircle, DollarSign, Activity, Settings, LogOut } from 'lucide-react'
import { CURRENCIES } from '@/lib/constants'

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default async function AdminDashboard() {
  let admin
  try { admin = await requireAdmin() }
  catch { redirect('/auth/login') }

  const stats = {
    totalUsers: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    activeUsers: (db.prepare("SELECT COUNT(*) as c FROM users WHERE is_active = 1").get() as any).c,
    pendingKyc: (db.prepare("SELECT COUNT(*) as c FROM users WHERE kyc_status = 'pending'").get() as any).c,
    totalTxns: (db.prepare('SELECT COUNT(*) as c FROM transactions').get() as any).c,
    completedTxns: (db.prepare("SELECT COUNT(*) as c FROM transactions WHERE status = 'completed'").get() as any).c,
    pendingTxns: (db.prepare("SELECT COUNT(*) as c FROM transactions WHERE status IN ('pending','processing')").get() as any).c,
    totalVolume: ((db.prepare("SELECT COALESCE(SUM(send_amount),0) as v FROM transactions WHERE status='completed'").get() as any).v as number),
    todayVolume: ((db.prepare("SELECT COALESCE(SUM(send_amount),0) as v FROM transactions WHERE status='completed' AND created_at > ?").get(Math.floor(Date.now()/1000)-86400) as any).v as number),
    totalFees: ((db.prepare("SELECT COALESCE(SUM(fee),0) as v FROM transactions WHERE status='completed'").get() as any).v as number),
  }

  const recentTxns = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email
    FROM transactions t JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC LIMIT 20
  `).all() as any[]

  const recentUsers = db.prepare(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT 10'
  ).all() as any[]

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    processing: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-screen bg-gray-900 text-white fixed left-0 top-0 hidden lg:flex flex-col">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#191C1F] flex items-center justify-center font-bold text-xs">RF</div>
              <div>
                <div className="font-bold text-sm">RemitFlow</div>
                <div className="text-xs text-gray-400">Admin Console</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {[
              { icon: Activity, label: 'Dashboard', href: '/admin', active: true },
              { icon: Users, label: 'Users', href: '/admin/users' },
              { icon: TrendingUp, label: 'Transactions', href: '/admin/transactions' },
              { icon: AlertCircle, label: 'KYC Review', href: '/admin/kyc' },
              { icon: DollarSign, label: 'Exchange Rates', href: '/admin/rates' },
              { icon: Settings, label: 'Settings', href: '/admin/settings' },
            ].map(n => (
              <Link key={n.label} href={n.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${n.active ? 'bg-[#191C1F] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-3 px-3">
              <div className="w-8 h-8 rounded-full bg-[#191C1F] flex items-center justify-center font-bold text-xs">
                {admin.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium">{admin.name}</div>
                <div className="text-xs text-gray-400">{admin.role}</div>
              </div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl text-sm transition-colors">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="lg:ml-64 flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm">Platform overview and key metrics</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Users', value: stats.totalUsers.toLocaleString(), sub: `${stats.activeUsers} active`, icon: '👤', color: 'text-[#0070F3]' },
              { label: 'Pending KYC', value: stats.pendingKyc.toLocaleString(), sub: 'awaiting review', icon: '🔍', color: 'text-amber-600' },
              { label: 'Total Transactions', value: stats.totalTxns.toLocaleString(), sub: `${stats.pendingTxns} pending`, icon: '💸', color: 'text-blue-600' },
              { label: 'Total Volume', value: `£${fmt(stats.totalVolume)}`, sub: `£${fmt(stats.todayVolume)} today`, icon: '📈', color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <div className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between p-5 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Recent Transactions</h2>
                <Link href="/admin/transactions" className="text-sm text-[#0070F3] hover:underline">View all</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">User</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">To</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentTxns.slice(0, 10).map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900 text-xs">{t.user_name}</div>
                          <div className="text-gray-400 text-xs">{t.user_email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-gray-900">
                            {CURRENCIES[t.send_currency as keyof typeof CURRENCIES]?.symbol}{t.send_amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">{t.send_currency}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900">{t.recipient_name ?? '—'}</div>
                          <div className="text-xs text-gray-400">{t.recipient_country ?? '—'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentTxns.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">No transactions yet</div>
                )}
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between p-5 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">New Users</h2>
                <Link href="/admin/users" className="text-sm text-[#0070F3] hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-gray-50">
                {recentUsers.map((u: any) => {
                  const kycColors: Record<string, string> = {
                    unverified: 'bg-red-50 text-red-600',
                    pending: 'bg-amber-50 text-amber-600',
                    verified: 'bg-emerald-50 text-emerald-600',
                    rejected: 'bg-red-50 text-red-600',
                  }
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#005CC5] font-bold text-sm shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-xs truncate">{u.name}</div>
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${kycColors[u.kyc_status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.kyc_status}
                      </span>
                    </div>
                  )
                })}
                {recentUsers.length === 0 && (
                  <div className="p-6 text-center text-gray-400 text-sm">No users yet</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
