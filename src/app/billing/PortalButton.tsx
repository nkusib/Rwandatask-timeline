'use client'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

export default function PortalButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      <ExternalLink className="w-4 h-4" />
      {loading ? 'Loading…' : 'Manage billing in Stripe'}
    </button>
  )
}
