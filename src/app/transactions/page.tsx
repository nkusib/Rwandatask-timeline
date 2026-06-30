import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Filter } from 'lucide-react'
import type { Transaction } from '@/lib/db'
import { CURRENCIES } from '@/lib/constants'
import { TransactionListAnimated } from '@/components/TransactionListAnimated'
import { BottomNav } from '@/components/BottomNav'

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

        <TransactionListAnimated txns={txns} />
      </div>

      <BottomNav />
    </div>
  )
}
