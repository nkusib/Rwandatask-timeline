import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { CURRENCIES } from '@/lib/constants'

export default async function AdminTransactionsPage() {
  try { await requireAdmin() }
  catch { redirect('/auth/login') }

  const txns = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email
    FROM transactions t JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC LIMIT 100
  `).all() as any[]

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    processing: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-[#0070F3]" />
            <span className="font-bold text-gray-900">Transactions</span>
          </div>
          <div className="ml-auto text-sm text-gray-500">{txns.length} transactions</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Sent</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {txns.map((t: any) => {
                  const sc = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
                  const rc = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-gray-500">{t.reference}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900 text-xs">{t.user_name}</div>
                        <div className="text-xs text-gray-400">{t.user_email}</div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">
                        {sc?.symbol}{t.send_amount.toFixed(2)} <span className="text-xs text-gray-400 font-normal">{t.send_currency}</span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-600">
                        {rc?.symbol}{Number(t.receive_amount).toLocaleString()} <span className="text-xs text-gray-400 font-normal">{t.receive_currency}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-gray-900">{t.recipient_name ?? '—'}</div>
                        <div className="text-xs text-gray-400">{t.recipient_country ?? '—'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        <div>{t.payment_method?.replace('_', ' ')}</div>
                        <div className="text-gray-400">{t.delivery_method?.replace('_', ' ')}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {new Date(t.created_at * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {txns.length === 0 && (
              <div className="p-12 text-center text-gray-400">No transactions yet</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
