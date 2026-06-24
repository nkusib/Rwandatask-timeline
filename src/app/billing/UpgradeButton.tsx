'use client'
import { useState } from 'react'

export default function UpgradeButton({ plan, label, highlighted }: { plan: string; label: string; highlighted?: boolean }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
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
      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
        highlighted ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-900 text-white hover:bg-gray-800'
      }`}
    >
      {loading ? 'Redirecting…' : label}
    </button>
  )
}
