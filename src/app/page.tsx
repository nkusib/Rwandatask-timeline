'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Shield, Zap, Globe, Smartphone, Star, ChevronDown, CheckCircle, TrendingUp, Users, Lock, CreditCard } from 'lucide-react'

const CORRIDORS = [
  { from: '🇬🇧 GBP', to: '🇳🇬 NGN', rate: '2,012', flag: '→' },
  { from: '🇪🇺 EUR', to: '🇰🇪 KES', rate: '140', flag: '→' },
  { from: '🇺🇸 USD', to: '🇬🇭 GHS', rate: '15.2', flag: '→' },
  { from: '🇬🇧 GBP', to: '🇿🇦 ZAR', rate: '23.4', flag: '→' },
  { from: '🇪🇺 EUR', to: '🇸🇳 XOF', rate: '655', flag: '→' },
  { from: '🇺🇸 USD', to: '🇪🇹 ETB', rate: '57.5', flag: '→' },
]

const FEATURES = [
  { icon: Zap, title: 'Instant Transfers', desc: 'Money arrives in minutes to mobile wallets. Bank deposits in 1-2 hours.' },
  { icon: Shield, title: 'Bank-Level Security', desc: 'FCA regulated. 256-bit encryption. Your money and data are always protected.' },
  { icon: TrendingUp, title: 'Best Exchange Rates', desc: 'Up to 8x cheaper than banks. Real exchange rates, tiny margin. Always transparent.' },
  { icon: Smartphone, title: 'Mobile Money', desc: 'Send directly to MTN, M-Pesa, Airtel, Orange and 20+ mobile wallets across Africa.' },
  { icon: Globe, title: '20+ Countries', desc: 'Europe and US to all major African corridors. More countries added monthly.' },
  { icon: Lock, title: 'FCA Regulated', desc: 'Fully licensed and regulated. GDPR compliant. Funds held in segregated accounts.' },
]

const TESTIMONIALS = [
  { name: 'Amara Diallo', role: 'London → Senegal', avatar: 'AD', quote: 'I send money to my family in Dakar every month. RemitFlow is 3x faster than my old bank and I save £12 per transfer.' },
  { name: 'Kwame Asante', role: 'Amsterdam → Ghana', avatar: 'KA', quote: 'The M-Pesa integration is perfect. My parents in Accra get the money on their phones immediately. No queue at the bank.' },
  { name: 'Ngozi Adeyemi', role: 'New York → Nigeria', avatar: 'NA', quote: 'Best rate I have found for USD to NGN. The app is clean, fast, and I trust it completely. Been using it for 6 months.' },
]

const MOBILE_PROVIDERS = [
  { name: 'MTN MoMo', countries: '8 countries', logo: '🟡' },
  { name: 'M-Pesa', countries: 'Kenya, Tanzania', logo: '🟢' },
  { name: 'Airtel Money', countries: '7 countries', logo: '🔴' },
  { name: 'Orange Money', countries: '4 countries', logo: '🟠' },
  { name: 'Wave', countries: 'Senegal, CI', logo: '🔵' },
]

export default function LandingPage() {
  const [sendAmount, setSendAmount] = useState('500')
  const [fromCurrency, setFromCurrency] = useState('GBP')
  const [toCurrency, setToCurrency] = useState('NGN')

  const QUICK_RATES: Record<string, Record<string, number>> = {
    GBP: { NGN: 2012, KES: 164.5, GHS: 19.3, ZAR: 23.4 },
    EUR: { NGN: 1718, KES: 140.4, GHS: 16.5, XOF: 655 },
    USD: { NGN: 1585, KES: 129.5, GHS: 15.2, ETB: 57.5 },
  }

  const rate = QUICK_RATES[fromCurrency]?.[toCurrency] ?? 1585
  const fee = parseFloat(sendAmount) < 200 ? 1.99 : 2.99
  const received = ((parseFloat(sendAmount) - fee) * rate).toFixed(0)

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#191C1F] flex items-center justify-center">
              <span className="text-white font-bold text-sm">RF</span>
            </div>
            <span className="font-bold text-lg text-gray-900">RemitFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            <a href="#rates" className="hover:text-gray-900 transition-colors">Rates</a>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#providers" className="hover:text-gray-900 transition-colors">Mobile Money</a>
            <a href="#testimonials" className="hover:text-gray-900 transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/auth/register" className="px-4 py-2 rounded-xl bg-[#191C1F] text-white text-sm font-semibold hover:bg-[#16181D] transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1B3A5C 60%, #0A1929 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-6 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live rates updated every 60 seconds
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Send money to Africa{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #34d399)' }}>
                  fast &amp; cheap
                </span>
              </h1>
              <p className="text-lg text-white/70 mb-8 leading-relaxed">
                Europe &amp; US to 20+ African countries. Mobile money, bank transfer or cash pickup.
                Up to 8x cheaper than banks. Money in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, #191C1F, #0F3460)' }}>
                  Send money now
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-semibold text-sm bg-white/10 hover:bg-white/20 border border-white/20 transition-colors">
                  <Smartphone className="w-4 h-4" />
                  Download app
                </Link>
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <div className="text-2xl font-bold text-white">2M+</div>
                  <div className="text-xs text-white/60">Customers</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div>
                  <div className="text-2xl font-bold text-white">20+</div>
                  <div className="text-xs text-white/60">Countries</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div>
                  <div className="text-2xl font-bold text-white">$2B+</div>
                  <div className="text-xs text-white/60">Transferred</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div>
                  <div className="text-2xl font-bold text-white">4.9★</div>
                  <div className="text-xs text-white/60">App Store</div>
                </div>
              </div>
            </div>

            {/* Calculator Card */}
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <h3 className="font-bold text-gray-900 text-lg mb-5">Calculate your transfer</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">You send</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={e => setSendAmount(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-[#0070F3] focus:border-transparent"
                      min="1"
                    />
                    <select
                      value={fromCurrency}
                      onChange={e => setFromCurrency(e.target.value)}
                      className="px-3 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0070F3]"
                    >
                      <option value="GBP">🇬🇧 GBP</option>
                      <option value="EUR">🇪🇺 EUR</option>
                      <option value="USD">🇺🇸 USD</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex-1 border-t border-dashed border-gray-200"></div>
                  <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-full">
                    <span className="text-emerald-600 font-medium">Fee: {fromCurrency === 'GBP' ? '£' : fromCurrency === 'EUR' ? '€' : '$'}{fee.toFixed(2)}</span>
                    <span className="text-gray-400">·</span>
                    <span>Rate: {rate.toLocaleString()}</span>
                  </div>
                  <div className="flex-1 border-t border-dashed border-gray-200"></div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Recipient gets</label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-[#003D99] font-bold text-lg">
                      {Number(received).toLocaleString()}
                    </div>
                    <select
                      value={toCurrency}
                      onChange={e => setToCurrency(e.target.value)}
                      className="px-3 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0070F3]"
                    >
                      <option value="NGN">🇳🇬 NGN</option>
                      <option value="KES">🇰🇪 KES</option>
                      <option value="GHS">🇬🇭 GHS</option>
                      <option value="ZAR">🇿🇦 ZAR</option>
                      <option value="ETB">🇪🇹 ETB</option>
                      <option value="XOF">🌍 XOF</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  <Zap className="w-3.5 h-3.5" />
                  Typically arrives in under 10 minutes
                </div>

                <Link href="/auth/register" className="block w-full py-3.5 rounded-xl text-white font-bold text-center text-sm transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #191C1F, #0F3460)' }}>
                  Send {sendAmount} {fromCurrency} now →
                </Link>
                <p className="text-center text-xs text-gray-400">No sign-up fee · Cancel anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Rates Strip */}
      <section id="rates" className="py-6 bg-gray-900 overflow-hidden">
        <div className="flex gap-10 animate-none">
          <div className="flex gap-10 items-center min-w-max px-6">
            {CORRIDORS.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm whitespace-nowrap">
                <span className="text-gray-400">{c.from}</span>
                <span className="text-gray-600">→</span>
                <span className="text-gray-400">{c.to}</span>
                <span className="text-emerald-400 font-semibold">{c.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-10 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
          {[
            { icon: '🏦', text: 'FCA Regulated UK' },
            { icon: '🇪🇺', text: 'EU Licensed' },
            { icon: '🔒', text: '256-bit Encryption' },
            { icon: '💳', text: 'PCI DSS Compliant' },
            { icon: '🛡️', text: 'GDPR Compliant' },
            { icon: '⭐', text: '4.9/5 on Trustpilot' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span>{b.icon}</span>
              <span className="font-medium">{b.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Sending money home,{' '}
              <span className="gradient-text">reimagined</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Built for the African diaspora in Europe and the US. Fast, affordable, and trusted.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <f.icon className="w-5 h-5 text-[#0070F3]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Money Providers */}
      <section id="providers" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#005CC5] text-xs font-medium mb-4">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile Money Network
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                20+ mobile wallets across Africa
              </h2>
              <p className="text-gray-500 mb-6 leading-relaxed">
                We&apos;re integrated directly with all major mobile money operators in Africa.
                Your recipient gets money straight to their phone — no bank account needed.
              </p>
              <ul className="space-y-3 mb-8">
                {['Real-time payment confirmation', 'Works even on basic phones', 'No bank account required', 'Available 24/7 including weekends'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#191C1F] text-white text-sm font-semibold hover:bg-[#16181D] transition-colors">
                Start sending
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {MOBILE_PROVIDERS.map((p) => (
                <div key={p.name} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">
                    {p.logo}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.countries}</div>
                  </div>
                  <CheckCircle className="ml-auto w-4 h-4 text-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How RemitFlow works</h2>
            <p className="text-gray-500">Three simple steps. Money in minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create account', desc: 'Sign up in 2 minutes with your email and phone. Quick ID verification for security.', icon: Users },
              { step: '02', title: 'Add recipient', desc: 'Enter your recipient\'s phone number or bank details. Save them for next time.', icon: Smartphone },
              { step: '03', title: 'Send & track', desc: 'Pay by card or bank transfer. Track your transfer in real-time. Gets there fast.', icon: TrendingUp },
            ].map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-[#0070F3] bg-blue-50">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods EU */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Pay from Europe &amp; USA</h2>
          <p className="text-gray-500 mb-8 text-sm">Multiple ways to fund your transfer</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '💳', title: 'Card', desc: 'Visa, Mastercard' },
              { icon: '🏦', title: 'Bank Transfer', desc: 'SEPA, Faster Payments' },
              { icon: '🇧🇪', title: 'Bancontact', desc: 'Belgium' },
              { icon: '🇳🇱', title: 'iDEAL', desc: 'Netherlands' },
            ].map((m) => (
              <div key={m.title} className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="font-semibold text-gray-900 text-sm">{m.title}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Trusted by the diaspora</h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-gray-500 text-sm">4.9/5 from 18,000+ reviews</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#191C1F] flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #4c1d95, #1e1b4b)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-3xl font-bold text-white mb-4">Get the RemitFlow app</h2>
          <p className="text-blue-200 mb-8 max-w-xl mx-auto">
            Send money anytime, anywhere. Track transfers, manage recipients, and get instant notifications.
            Available on iOS and Android.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth/register" className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors">
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <div className="text-xs text-gray-500">Download on the</div>
                <div className="font-bold">App Store</div>
              </div>
            </Link>
            <Link href="/auth/register" className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors">
              <span className="text-2xl">🤖</span>
              <div className="text-left">
                <div className="text-xs text-gray-500">Get it on</div>
                <div className="font-bold">Google Play</div>
              </div>
            </Link>
          </div>
          <p className="text-violet-300 text-xs">Or use the web app at remitflow.app</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#191C1F] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">RF</span>
                </div>
                <span className="text-white font-bold">RemitFlow</span>
              </div>
              <p className="text-sm leading-relaxed">
                The fastest, cheapest way to send money from Europe and the US to Africa.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold text-sm mb-4">Send to</div>
              <ul className="space-y-2 text-sm">
                {['Nigeria', 'Kenya', 'Ghana', 'Tanzania', 'South Africa', 'Senegal'].map(c => (
                  <li key={c}><a href="#" className="hover:text-white transition-colors">{c}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold text-sm mb-4">Company</div>
              <ul className="space-y-2 text-sm">
                {['About us', 'Careers', 'Blog', 'Press', 'Compliance', 'Security'].map(c => (
                  <li key={c}><a href="#" className="hover:text-white transition-colors">{c}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold text-sm mb-4">Support</div>
              <ul className="space-y-2 text-sm">
                {['Help centre', 'Contact us', 'Privacy policy', 'Terms of service', 'Cookie policy'].map(c => (
                  <li key={c}><a href="#" className="hover:text-white transition-colors">{c}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>&copy; 2025 RemitFlow Ltd. All rights reserved. FCA regulated (FRN: 000000)</p>
            <p>RemitFlow Ltd, 1 Canada Square, London E14 5AB</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
