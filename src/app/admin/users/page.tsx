import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'

export default async function AdminUsersPage() {
  try { await requireAdmin() }
  catch { redirect('/auth/login') }

  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as any[]

  const kycColors: Record<string, string> = {
    unverified: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-50 text-amber-700',
    verified: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#0070F3]" />
            <span className="font-bold text-gray-900">Users</span>
          </div>
          <div className="ml-auto text-sm text-gray-500">{users.length} total users</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">KYC</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[#005CC5] font-bold text-sm shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{u.country}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kycColors[u.kyc_status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.kyc_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'user' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-[#005CC5]'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">
                      {new Date(u.created_at * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-12 text-center text-gray-400">No users yet</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
