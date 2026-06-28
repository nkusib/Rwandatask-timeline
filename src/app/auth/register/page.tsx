'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, CheckCircle, Phone, RefreshCw } from 'lucide-react'

const COUNTRIES = [
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'BE', name: '🇧🇪 Belgium' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
  { code: 'KE', name: '🇰🇪 Kenya' },
  { code: 'GH', name: '🇬🇭 Ghana' },
  { code: 'ZA', name: '🇿🇦 South Africa' },
  { code: 'TZ', name: '🇹🇿 Tanzania' },
]

type Stage = 'form' | 'otp'

export default function RegisterPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('form')
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: 'GB', password: '' })
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [devCode, setDevCode] = useState<string | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const pwScore = (() => {
    const p = form.password
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  })()

  async function sendOtp() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Failed to send code'); return }
      if (data.dev_code) setDevCode(data.dev_code)
      setStage('otp')
      setResendCooldown(60)
      const tick = setInterval(() => setResendCooldown(c => { if (c <= 1) clearInterval(tick); return Math.max(0, c - 1) }), 1000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.phone) { setError('Phone number is required for verification'); return }
    await sendOtp()
  }

  function handleOtpInput(i: number, val: string) {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      otpRefs.current[5]?.focus()
    }
    e.preventDefault()
  }

  async function verifyAndRegister() {
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, otp: code }),
      })
      const data = await r.json()
      if (!r.ok) {
        if (data.field === 'otp') {
          setError(data.error)
          setOtp(['', '', '', '', '', ''])
          otpRefs.current[0]?.focus()
        } else {
          setError(data.error || 'Verification failed')
        }
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (stage === 'otp') {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <LeftPanel />
        <div className="flex items-center justify-center p-6 sm:p-12 bg-gray-50">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#191C1F] flex items-center justify-center font-bold text-xs text-white">RF</div>
              <span className="font-bold text-gray-900">RemitFlow</span>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
                <Phone className="w-7 h-7 text-[#0070F3]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Verify your phone</h1>
              <p className="text-gray-500 text-sm mb-1 text-center">We sent a 6-digit code to</p>
              <p className="text-[#005CC5] font-semibold text-sm text-center mb-6">{form.phone}</p>

              {devCode && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center">
                  Dev mode — OTP: <span className="font-mono font-bold text-base">{devCode}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              {/* OTP digit inputs */}
              <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-[#0070F3] focus:outline-none transition-colors"
                  />
                ))}
              </div>

              <button
                onClick={verifyAndRegister}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
                style={{ background: 'linear-gradient(135deg, #191C1F, #0F3460)' }}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Verify &amp; create account</span><ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <span className="text-sm text-gray-400">Resend code in {resendCooldown}s</span>
                ) : (
                  <button onClick={sendOtp} disabled={loading}
                    className="text-sm text-[#0070F3] hover:underline font-medium flex items-center gap-1 mx-auto">
                    <RefreshCw className="w-3.5 h-3.5" /> Resend code
                  </button>
                )}
              </div>

              <button onClick={() => { setStage('form'); setOtp(['', '', '', '', '', '']); setError('') }}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 text-center">
                ← Change phone number
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <LeftPanel />
      <div className="flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#191C1F] flex items-center justify-center font-bold text-xs text-white">RF</div>
            <span className="font-bold text-gray-900">RemitFlow</span>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm mb-6">Start sending money in under 2 minutes</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input type="text" required value={form.name} onChange={update('name')} placeholder="Your full name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3] text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3] text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone number <span className="text-[#0070F3] text-xs font-normal">(for verification)</span>
                </label>
                <input type="tel" required value={form.phone} onChange={update('phone')} placeholder="+44 7700 000000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3] text-sm" />
                <p className="text-xs text-gray-400 mt-1">We&apos;ll send a verification code to this number</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country of residence</label>
                <select value={form.country} onChange={update('country')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0070F3] text-sm">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={update('password')}
                    placeholder="At least 8 characters with numbers"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0070F3] text-sm" />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 flex gap-1">
                    {[1,2,3,4].map(n => (
                      <div key={n} className={`flex-1 h-1 rounded-full transition-colors ${
                        pwScore >= n
                          ? n <= 2 ? 'bg-amber-400' : n === 3 ? 'bg-emerald-400' : 'bg-emerald-500'
                          : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                By creating an account you agree to our{' '}
                <a href="#" className="text-[#0070F3] hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-[#0070F3] hover:underline">Privacy Policy</a>.
              </p>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:scale-100"
                style={{ background: 'linear-gradient(135deg, #191C1F, #0F3460)' }}>
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Send verification code</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#0070F3] font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LeftPanel() {
  return (
    <div className="hidden lg:flex flex-col p-12 text-white" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1B3A5C 60%, #0A1929 100%)' }}>
      <Link href="/" className="flex items-center gap-2 mb-16">
        <div className="w-9 h-9 rounded-xl bg-[#0070F3] flex items-center justify-center font-bold text-sm">RF</div>
        <span className="font-bold text-lg">RemitFlow</span>
      </Link>
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-3xl font-bold mb-4">Send money home in minutes</h2>
        <p className="text-blue-200 mb-10">Join 2 million people who trust RemitFlow to send money to Africa.</p>
        <div className="space-y-4">
          {[
            'Free to sign up — send up to £50 before verifying',
            'Best exchange rates — up to 8x cheaper than banks',
            'Send to 20+ African countries',
            'Mobile money, bank transfer, cash pickup',
            'FCA regulated and fully licensed',
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm text-white/90">{f}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 p-4 rounded-xl bg-white/10 border border-white/20">
          <p className="text-sm text-white/80 italic">&ldquo;RemitFlow cut my transfer cost by 70%. My family in Lagos gets the money in 5 minutes now.&rdquo;</p>
          <p className="text-xs text-white/50 mt-2">— Emeka O., London</p>
        </div>
      </div>
      <p className="text-xs text-white/40">© 2025 RemitFlow Ltd. FCA regulated.</p>
    </div>
  )
}
