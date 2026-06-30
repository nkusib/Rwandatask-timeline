'use client'

import { useEffect, useState } from 'react'
import { Monitor, Smartphone, Tablet, Trash2, LogOut, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animation-variants'

type Session = {
  session_id: string
  device_fingerprint: string
  user_agent: string
  ip_address: string
  created_at: number
  last_active_at: number
  is_new: number
}

function deviceIcon(ua: string) {
  const lower = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk/i.test(lower)) return Tablet
  if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(lower)) return Smartphone
  return Monitor
}

function relativeTime(ts: number) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function parseUA(ua: string) {
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux'
    : /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad/i.test(ua) ? 'iOS'
    : 'Unknown OS'

  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /OPR\//i.test(ua) ? 'Opera'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Safari\//i.test(ua) ? 'Safari'
    : 'Browser'

  return `${browser} on ${os}`
}

export default function SessionsCard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [signingOutAll, setSigningOutAll] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/auth/sessions')
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      setSessions(data.sessions ?? [])
    } catch {
      setError('Could not load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId)
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId))
      }
    } finally {
      setRevoking(null)
    }
  }

  async function revokeAll() {
    setSigningOutAll(true)
    try {
      await fetch('/api/auth/sessions', { method: 'POST' })
      // Will redirect via server; navigate manually as fallback
      window.location.href = '/auth/login'
    } catch {
      setSigningOutAll(false)
    }
  }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="px-5 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h3 className="font-bold text-white text-sm">Active sessions</h3>
          <p className="text-xs text-white/40 mt-0.5">Devices signed in to your account</p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={revokeAll}
            disabled={signingOutAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            style={{ background: 'rgba(217,45,32,0.12)', border: '1px solid rgba(217,45,32,0.18)' }}
          >
            {signingOutAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
            Sign out all
          </button>
        )}
      </div>

      {/* Skeleton loader */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-5 space-y-4"
          >
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl shrink-0 skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-full skeleton-shimmer" style={{ width: `${55 + i * 15}%` }} />
                  <div className="h-2.5 rounded-full skeleton-shimmer" style={{ width: `${40 + i * 10}%` }} />
                </div>
                <div className="w-8 h-8 rounded-xl skeleton-shimmer shrink-0" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {error && !loading && (
        <div className="px-5 py-4 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="px-5 py-4 text-sm text-white/40">No active sessions found.</div>
      )}

      <AnimatePresence>
        {!loading && !error && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {sessions.map((s, idx) => {
              const Icon = deviceIcon(s.user_agent)
              const isLast = idx === sessions.length - 1
              const isCurrent = idx === 0
              return (
                <motion.div
                  key={s.session_id}
                  variants={staggerItem}
                  className="flex items-center gap-4 px-5 py-4"
                  style={isLast ? {} : { borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isCurrent ? 'rgba(19,38,253,0.25)' : 'rgba(255,255,255,0.08)' }}
                  >
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#7B8CFF]' : 'text-white/60'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm truncate">{parseUA(s.user_agent)}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-[#7B8CFF] shrink-0" style={{ background: 'rgba(19,38,253,0.20)' }}>
                          This device
                        </span>
                      )}
                      {s.is_new === 1 && !isCurrent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-amber-400 shrink-0" style={{ background: 'rgba(247,144,9,0.15)' }}>
                          New
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5 truncate">
                      {s.ip_address} · {relativeTime(s.last_active_at)}
                    </div>
                  </div>
                  {!isCurrent && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => revokeSession(s.session_id)}
                      disabled={revoking === s.session_id}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                      title="Revoke session"
                    >
                      {revoking === s.session_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
