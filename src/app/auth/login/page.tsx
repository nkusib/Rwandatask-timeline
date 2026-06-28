'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Fingerprint, AlertCircle } from 'lucide-react'

type BiometricState = 'idle' | 'prompting' | 'success' | 'unavailable' | 'error'

function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricState, setBiometricState] = useState<BiometricState>('idle')

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  function redirectForRole(role: string) {
    if (role === 'admin' || role === 'super_admin') router.push('/admin')
    else router.push('/dashboard')
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error || 'Login failed')
        return
      }
      redirectForRole(data.role)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loginWithBiometric = useCallback(async () => {
    setError('')
    setBiometricState('prompting')

    try {
      if (!window.PublicKeyCredential) {
        setBiometricState('unavailable')
        setError('Biometric login is not supported in this browser.')
        return
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      if (!available) {
        setBiometricState('unavailable')
        setError('No biometric sensor found on this device.')
        return
      }

      const email = form.email.trim()
      const qs = email ? `?email=${encodeURIComponent(email)}` : ''
      const challengeRes = await fetch(`/api/auth/webauthn/authenticate${qs}`)
      if (!challengeRes.ok) throw new Error('Could not start biometric authentication')
      const opts = await challengeRes.json()

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: Uint8Array.from(
          atob(opts.challenge.replace(/-/g, '+').replace(/_/g, '/')),
          c => c.charCodeAt(0)
        ),
        rpId: opts.rpId,
        timeout: opts.timeout,
        userVerification: 'required',
        allowCredentials: (opts.allowCredentials ?? []).map((c: { id: string; type: string }) => ({
          id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0)),
          type: c.type,
        })),
      }

      const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null

      if (!assertion) {
        setBiometricState('error')
        setError('Biometric authentication was cancelled.')
        return
      }

      const response = assertion.response as AuthenticatorAssertionResponse

      const verifyRes = await fetch('/api/auth/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: b64urlEncode(assertion.rawId),
          clientDataJSON: b64urlEncode(response.clientDataJSON),
          authenticatorData: b64urlEncode(response.authenticatorData),
          signature: b64urlEncode(response.signature),
        }),
      })

      const result = await verifyRes.json()
      if (!verifyRes.ok) {
        setBiometricState('error')
        setError(result.error || 'Biometric verification failed.')
        return
      }

      setBiometricState('success')
      redirectForRole(result.role)
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setBiometricState('idle')
        setError('Biometric authentication was cancelled.')
      } else if (e.name === 'NotSupportedError') {
        setBiometricState('unavailable')
        setError('Biometric login is not supported on this device.')
      } else {
        setBiometricState('error')
        setError(e.message || 'Biometric authentication failed.')
      }
    }
  }, [form.email, router])

  const biometricLabel = () => {
    if (biometricState === 'prompting') return 'Waiting for biometric…'
    if (biometricState === 'success') return 'Verified!'
    return 'Sign in with Face ID / Touch ID'
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col p-12 text-white" style={{ background: '#161618' }}>
        <Link href="/" className="flex items-center gap-2 mb-16">
          <div className="w-9 h-9 rounded-xl bg-[#1326FD] flex items-center justify-center font-bold text-sm">RF</div>
          <span className="font-bold text-lg">RemitFlow</span>
        </Link>
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-4">Welcome back</h2>
          <p className="text-gray-400 mb-6">Continue sending money to your loved ones in Africa, faster and cheaper than ever.</p>
          <div className="space-y-3 text-sm text-gray-400">
            <p>📱 Track transfers in real-time</p>
            <p>💱 Live exchange rates, best on the market</p>
            <p>🏦 20+ countries, mobile money &amp; bank transfer</p>
            <p>🔏 Biometric sign-in — no password needed</p>
          </div>
        </div>
        <p className="text-xs text-gray-600">© 2025 RemitFlow Ltd. FCA regulated.</p>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#F7F8FA]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#161618] flex items-center justify-center font-bold text-xs text-white">RF</div>
            <span className="font-bold text-gray-900">RemitFlow</span>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E5E7EB]">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm mb-6">Welcome back to RemitFlow</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Biometric button */}
            <button
              onClick={loginWithBiometric}
              disabled={biometricState === 'prompting' || biometricState === 'success'}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 mb-5 border-2 transition-all ${
                biometricState === 'success'
                  ? 'border-[#008F5A] bg-[#E8F8F1] text-[#008F5A]'
                  : biometricState === 'prompting'
                  ? 'border-[#1326FD]/30 bg-[#EAF2FF] text-[#1326FD] cursor-wait'
                  : 'border-[#E5E7EB] bg-white text-gray-900 hover:border-[#1326FD]/50 hover:bg-[#EAF2FF]/50'
              } disabled:opacity-70`}
            >
              {biometricState === 'prompting' ? (
                <div className="w-5 h-5 border-2 border-[#1326FD]/30 border-t-[#1326FD] rounded-full animate-spin" />
              ) : biometricState === 'success' ? (
                <span className="text-lg">✓</span>
              ) : (
                <Fingerprint className="w-5 h-5" />
              )}
              <span>{biometricLabel()}</span>
            </button>

            <p className="text-xs text-gray-400 text-center mb-5 -mt-3">
              Uses Face ID, Touch ID, or Windows Hello · No password needed
            </p>

            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-gray-400 font-medium">or sign in with password</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email" required value={form.email} onChange={update('email')}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-gray-900 placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <a href="#" className="text-xs text-[#1326FD] hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} required value={form.password}
                    onChange={update('password')} placeholder="Your password"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E5E7EB] text-gray-900 placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent text-sm"
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#1326FD] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-[#0D1DBD] disabled:bg-[#D0D5DD] disabled:text-[#98A2B3] disabled:cursor-not-allowed"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              New to RemitFlow?{' '}
              <Link href="/auth/register" className="text-[#1326FD] font-medium hover:underline">Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
