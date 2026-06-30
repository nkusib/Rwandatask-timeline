'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { Transaction } from '@/lib/db'
import { CURRENCIES, TRANSACTION_STATUS_LABELS } from '@/lib/constants'
import { staggerContainer, staggerItem } from '@/lib/animation-variants'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦', ET: '🇪🇹', ZM: '🇿🇲',
}

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  txns: Transaction[]
}

export function TransactionListAnimated({ txns }: Props) {
  if (txns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl py-16 text-center"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-4xl mb-3">💸</div>
        <div className="font-semibold text-white/70 mb-1">No transfers yet</div>
        <div className="text-sm text-white/40 mb-5">Your transfer history will appear here</div>
        <Link
          href="/send"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold bg-[#1326FD] hover:bg-[#0D1DBD] transition-colors"
        >
          Send money
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="rounded-3xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {txns.map((t, i) => {
        const st = TRANSACTION_STATUS_LABELS[t.status]
        const sendCur = CURRENCIES[t.send_currency as keyof typeof CURRENCIES]
        const recCur = CURRENCIES[t.receive_currency as keyof typeof CURRENCIES]
        return (
          <motion.div
            key={t.id}
            variants={staggerItem}
            className="flex items-center gap-3 px-4 py-4 hover:bg-white/5 transition-colors"
            style={i < txns.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
          >
            <Link href={`/transactions/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                {t.recipient_country ? (COUNTRY_FLAGS[t.recipient_country] ?? '🌍') : '🌍'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm truncate">{t.recipient_name ?? 'Transfer'}</div>
                <div className="text-xs text-white/40 flex items-center gap-2">
                  <span>{timeAgo(t.created_at)}</span>
                  {t.delivery_method && (
                    <>
                      <span>·</span>
                      <span>{t.delivery_method === 'mobile_money' ? '📱 Mobile' : '🏦 Bank'}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-white text-sm">
                  -{sendCur?.symbol}{t.send_amount.toFixed(2)}
                </div>
                <div className="text-xs text-white/40">
                  {recCur?.symbol}{Number(t.receive_amount).toLocaleString()} {t.receive_currency}
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st?.bg} ${st?.color}`}>
                {st?.label}
              </span>
              {t.status === 'completed' && (
                <Link
                  href={`/send?from_transaction=${t.id}`}
                  className="px-2.5 py-1 rounded-lg text-[#7B8CFF] text-xs font-semibold hover:text-white transition-colors"
                  style={{ background: 'rgba(19,38,253,0.20)' }}
                >
                  Repeat
                </Link>
              )}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
