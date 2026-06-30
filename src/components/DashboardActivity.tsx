'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Transaction } from '@/lib/db'
import { CURRENCIES, TRANSACTION_STATUS_LABELS } from '@/lib/constants'
import { staggerContainer, staggerItem } from '@/lib/animation-variants'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦',
  ET: '🇪🇹', ZM: '🇿🇲',
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

interface Props {
  recentTxns: Transaction[]
}

export function DashboardActivity({ recentTxns }: Props) {
  if (recentTxns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="py-14 text-center"
      >
        <div className="text-4xl mb-3">💸</div>
        <div className="font-semibold text-white/70 mb-1">No transfers yet</div>
        <div className="text-sm text-white/40 mb-5">Send money to your first recipient</div>
        <Link
          href="/send"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold bg-[#1326FD] hover:bg-[#0D1DBD] transition-colors"
        >
          <Plus className="w-4 h-4" /> Send money
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      {recentTxns.map((t, i) => {
        const st = TRANSACTION_STATUS_LABELS[t.status]
        const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
        const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
        return (
          <motion.div key={t.id} variants={staggerItem}>
            <Link
              href={`/transactions/${t.id}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors"
              style={i < recentTxns.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
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
                  {recCur?.symbol}{Number(t.receive_amount).toLocaleString()} {t.receive_currency}
                </div>
              </div>
              <span className={`ml-1 shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${st?.bg} ${st?.color}`}>
                {st?.label}
              </span>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
