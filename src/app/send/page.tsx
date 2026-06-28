'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Info, CheckCircle, Loader, AlertCircle, RefreshCw } from 'lucide-react'

const SEND_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
]

const RECEIVE_COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', methods: ['mobile_money', 'bank'] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', methods: ['mobile_money', 'bank'] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', methods: ['mobile_money', 'bank'] },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', methods: ['mobile_money', 'bank'] },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX', methods: ['mobile_money', 'bank'] },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', methods: ['bank'] },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', currency: 'XOF', methods: ['mobile_money', 'bank'] },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF', methods: ['mobile_money'] },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', currency: 'XAF', methods: ['mobile_money', 'bank'] },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD', methods: ['bank'] },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB', methods: ['bank'] },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', currency: 'ZMW', methods: ['mobile_money', 'bank'] },
]

const MOBILE_PROVIDERS: Record<string, string[]> = {
  NG: ['mtn', 'airtel'],
  KE: ['mpesa', 'airtel'],
  GH: ['mtn', 'vodafone', 'airtel'],
  TZ: ['mpesa', 'airtel', 'tigo'],
  UG: ['mtn', 'airtel'],
  SN: ['orange', 'wave'],
  CI: ['orange', 'wave', 'mtn'],
  CM: ['mtn', 'orange', 'airtel'],
  ZM: ['mtn', 'airtel'],
}

const PROVIDER_NAMES: Record<string, string> = {
  mtn: 'MTN Mobile Money',
  mpesa: 'M-Pesa',
  airtel: 'Airtel Money',
  orange: 'Orange Money',
  wave: 'Wave',
  vodafone: 'Vodafone Cash',
  tigo: 'Tigo Cash',
}

const PHONE_PLACEHOLDERS: Record<string, string> = {
  NG: '+234 803 000 0000',
  KE: '+254 700 000000',
  GH: '+233 244 000000',
  TZ: '+255 754 000000',
  UG: '+256 700 000000',
  ZA: '+27 71 000 0000',
  SN: '+221 76 000 0000',
  CI: '+225 07 00 00 00',
  CM: '+237 650 000000',
  MA: '+212 600 000000',
  ET: '+251 911 000000',
  ZM: '+260 955 000000',
}

const PAYMENT_METHODS = [
  { id: 'card', name: 'Debit/Credit Card', icon: '💳', desc: 'Instant · Visa, Mastercard' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', desc: '1-2 business days · Free' },
  { id: 'bancontact', name: 'Bancontact', icon: '🇧🇪', desc: 'Belgium only · Instant' },
  { id: 'ideal', name: 'iDEAL', icon: '🇳🇱', desc: 'Netherlands only · Instant' },
]

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', EUR: '€', USD: '$', NGN: '₦', KES: 'KSh', GHS: 'GH₵',
  TZS: 'TSh', UGX: 'USh', ZAR: 'R', XOF: 'CFA', XAF: 'FCFA', MAD: 'MAD', ETB: 'ETB', ZMW: 'ZK'
}

const MOCK_RATES: Record<string, Record<string, number>> = {
  GBP: { NGN: 2012, KES: 164.5, GHS: 19.3, TZS: 3403, UGX: 4710, ZAR: 23.4, XOF: 833, XAF: 833, MAD: 12.6, ETB: 73, ZMW: 33.6 },
  EUR: { NGN: 1718, KES: 140.4, GHS: 16.5, TZS: 2910, UGX: 4024, ZAR: 20.0, XOF: 655, XAF: 655, MAD: 10.8, ETB: 62.3, ZMW: 28.7 },
  USD: { NGN: 1585, KES: 129.5, GHS: 15.2, TZS: 2680, UGX: 3710, ZAR: 18.45, XOF: 607, XAF: 607, MAD: 9.95, ETB: 57.5, ZMW: 26.5 },
}

type Step = 'amount' | 'recipient' | 'payment' | 'review' | 'confirm'

function SendPageContent() {
  const router = useRouter()
  const params = useSearchParams()
  const presetTo = params.get('to')
  const fromTxnId = params.get('from_transaction')

  const [step, setStep] = useState<Step>('amount')
  const [fromCountry, setFromCountry] = useState(SEND_COUNTRIES[0])
  const [toCountry, setToCountry] = useState(RECEIVE_COUNTRIES.find(c => c.code === presetTo) ?? RECEIVE_COUNTRIES[0])
  const [sendAmount, setSendAmount] = useState('200')
  const [deliveryMethod, setDeliveryMethod] = useState<'mobile_money' | 'bank'>('mobile_money')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [mobileProvider, setMobileProvider] = useState('')
  const [recipient, setRecipient] = useState({ name: '', phone: '', bankAccount: '', bankName: '' })
  const [loading, setLoading] = useState(false)
  const [txnId, setTxnId] = useState('')

  const [prefilled, setPrefilled] = useState(false)
  const [prefillBanner, setPrefillBanner] = useState('')
  const [prefillError, setPrefillError] = useState('')
  const [repeatWarnings, setRepeatWarnings] = useState<string[]>([])
  const [origRate, setOrigRate] = useState<number | null>(null)
  const [origFee, setOrigFee] = useState<number | null>(null)
  const skipToCountryEffect = useRef(false)

  const rate = MOCK_RATES[fromCountry.currency]?.[toCountry.currency] ?? 1000
  const fee = paymentMethod === 'bank_transfer' ? 0.99 : 1.99
  const net = Math.max(0, parseFloat(sendAmount) - fee)
  const receives = (net * rate).toFixed(0)
  const total = (parseFloat(sendAmount)).toFixed(2)

  const rateChanged = prefilled && origRate !== null && Math.abs(rate - origRate) / Math.max(origRate, 1) > 0.001
  const feeChanged = prefilled && origFee !== null && Math.abs(fee - origFee) > 0.005

  useEffect(() => {
    if (skipToCountryEffect.current) {
      skipToCountryEffect.current = false
      return
    }
    const providers = MOBILE_PROVIDERS[toCountry.code] ?? []
    if (providers.length > 0) setMobileProvider(providers[0])
    const methods = toCountry.methods
    if (!methods.includes(deliveryMethod)) setDeliveryMethod(methods[0] as any)
  }, [toCountry])

  useEffect(() => {
    if (!fromTxnId) return
    fetch(`/api/transactions/${fromTxnId}/repeat`)
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          setPrefillError(data.reason ?? 'This transfer cannot be repeated.')
          return
        }
        const p = data.prefill
        const from = SEND_COUNTRIES.find(c => c.currency === p.sendCurrency)
        const to = RECEIVE_COUNTRIES.find(c => c.code === p.toCountryCode)
        if (from) setFromCountry(from)
        if (to) {
          skipToCountryEffect.current = true
          setToCountry(to)
        }
        setSendAmount(p.sendAmount || '200')
        if (p.deliveryMethod) setDeliveryMethod(p.deliveryMethod)
        if (p.paymentMethod) setPaymentMethod(p.paymentMethod)
        if (p.mobileProvider) setMobileProvider(p.mobileProvider)
        setRecipient({
          name: p.recipientName ?? '',
          phone: p.recipientPhone ?? '',
          bankName: p.bankName ?? '',
          bankAccount: p.bankAccount ?? '',
        })
        setOrigRate(data.originalRate ?? null)
        setOrigFee(data.originalFee ?? null)
        setRepeatWarnings(data.warnings ?? [])
        setPrefilled(true)
        setPrefillBanner(`Prefilled from your last transfer to ${p.recipientName || 'recipient'} · Edit below to adjust`)
      })
      .catch(() => setPrefillError('Could not load transfer details. Please fill in the form manually.'))
  }, [fromTxnId])

  async function submitTransfer() {
    setLoading(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendAmount: parseFloat(sendAmount),
          sendCurrency: fromCountry.currency,
          receiveAmount: parseFloat(receives),
          receiveCurrency: toCountry.currency,
          exchangeRate: rate,
          fee,
          totalAmount: parseFloat(total),
          paymentMethod,
          deliveryMethod,
          recipientName: recipient.name,
          recipientCountry: toCountry.code,
          recipientDetails: deliveryMethod === 'mobile_money'
            ? JSON.stringify({ provider: mobileProvider, phone: recipient.phone })
            : JSON.stringify({ bankName: recipient.bankName, account: recipient.bankAccount }),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTxnId(data.id)
        setStep('confirm')
      }
    } catch {}
    setLoading(false)
  }

  const fromSym = CURRENCY_SYMBOLS[fromCountry.currency] ?? ''
  const toSym = CURRENCY_SYMBOLS[toCountry.currency] ?? ''

  const steps = ['amount', 'recipient', 'payment', 'review'] as const
  const stepIndex = steps.indexOf(step as any)

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-[#E5E7EB] text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#E8F8F1] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#008F5A]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer initiated!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your transfer of {fromSym}{sendAmount} to {recipient.name} in {toCountry.name} is being processed.
          </p>
          <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm mb-6 space-y-2 text-left">
            <div className="flex justify-between"><span className="text-[#667085]">Reference</span><span className="font-mono font-medium text-xs">{txnId?.slice(0, 12).toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-[#667085]">They receive</span><span className="font-semibold text-[#008F5A]">{toSym}{Number(receives).toLocaleString()} {toCountry.currency}</span></div>
            <div className="flex justify-between"><span className="text-[#667085]">Estimated arrival</span><span className="font-medium">Under 30 minutes</span></div>
          </div>
          <div className="space-y-3">
            <Link href={`/transactions/${txnId}`} className="block w-full py-3 rounded-xl font-semibold text-sm text-white bg-[#1326FD] hover:bg-[#0D1DBD] transition-colors text-center">
              Track transfer
            </Link>
            <Link href="/dashboard" className="block w-full py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] text-gray-700 hover:bg-gray-50 transition-colors text-center">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Send money</span>
          {/* Progress indicator */}
          <div className="ml-auto flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all ${i <= stepIndex ? 'bg-[#1326FD] w-8' : 'bg-[#E5E7EB] w-4'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step: Amount */}
        {step === 'amount' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] animate-fadeIn">
            {prefillError && (
              <div className="mb-5 flex items-start gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{prefillError}</span>
              </div>
            )}
            {prefillBanner && !prefillError && (
              <div className="mb-5 flex items-start gap-2 p-3.5 bg-[#EAF2FF] border border-[#1326FD]/20 rounded-xl text-[#1326FD] text-sm">
                <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{prefillBanner}</span>
              </div>
            )}
            <h2 className="font-bold text-gray-900 text-lg mb-5">How much to send?</h2>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-[#667085] mb-1.5">From</label>
                <select
                  value={fromCountry.code}
                  onChange={e => setFromCountry(SEND_COUNTRIES.find(c => c.code === e.target.value)!)}
                  className="w-full px-3 py-3 rounded-xl border border-[#E5E7EB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                >
                  {SEND_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#667085] mb-1.5">To</label>
                <select
                  value={toCountry.code}
                  onChange={e => setToCountry(RECEIVE_COUNTRIES.find(c => c.code === e.target.value)!)}
                  className="w-full px-3 py-3 rounded-xl border border-[#E5E7EB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                >
                  {RECEIVE_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#667085] mb-1.5">You send ({fromCountry.currency})</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3] font-medium">{fromSym}</span>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={e => setSendAmount(e.target.value)}
                  min={1}
                  className="w-full pl-8 pr-4 py-4 rounded-xl border border-[#E5E7EB] text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-[#F7F8FA] rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between text-[#667085]">
                <span>Transfer fee</span>
                <span className="text-gray-900 font-medium">{fromSym}{fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>Exchange rate</span>
                <span className="text-gray-900 font-medium">1 {fromCountry.currency} = {rate.toLocaleString()} {toCountry.currency}</span>
              </div>
              <div className="border-t border-[#E5E7EB] pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Recipient gets</span>
                <span className="font-bold text-[#008F5A] text-base">{toSym}{Number(receives).toLocaleString()} {toCountry.currency}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#1326FD] bg-[#EAF2FF] px-3 py-2 rounded-lg mb-5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Estimated delivery: under 30 minutes to mobile money
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-[#667085] mb-2">Delivery method</label>
              <div className="grid grid-cols-2 gap-2">
                {toCountry.methods.map(m => (
                  <button
                    key={m}
                    onClick={() => setDeliveryMethod(m as any)}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      deliveryMethod === m
                        ? 'border-[#1326FD] bg-[#EAF2FF] text-[#1326FD]'
                        : 'border-[#E5E7EB] text-gray-700 hover:border-[#D0D5DD]'
                    }`}
                  >
                    <div>{m === 'mobile_money' ? '📱 Mobile Money' : '🏦 Bank Deposit'}</div>
                    <div className={`text-xs mt-0.5 ${deliveryMethod === m ? 'text-[#1326FD]/70' : 'text-[#98A2B3]'}`}>
                      {m === 'mobile_money' ? 'Under 10 min' : '1-2 hours'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('recipient')}
              disabled={!sendAmount || parseFloat(sendAmount) < 1}
              className="w-full py-3.5 rounded-xl bg-[#1326FD] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0D1DBD] transition-colors disabled:bg-[#D0D5DD] disabled:text-[#98A2B3] disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step: Recipient */}
        {step === 'recipient' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] animate-fadeIn">
            <button onClick={() => setStep('amount')} className="flex items-center gap-1.5 text-sm text-[#667085] hover:text-gray-900 mb-5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-bold text-gray-900 text-lg mb-5">Recipient details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#667085] mb-1.5">Full name</label>
                <input
                  type="text"
                  value={recipient.name}
                  onChange={e => setRecipient(p => ({ ...p, name: e.target.value }))}
                  placeholder="Recipient's full name"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                />
              </div>

              {deliveryMethod === 'mobile_money' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#667085] mb-1.5">Mobile provider</label>
                    <select
                      value={mobileProvider}
                      onChange={e => setMobileProvider(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                    >
                      {(MOBILE_PROVIDERS[toCountry.code] ?? []).map(p => (
                        <option key={p} value={p}>{PROVIDER_NAMES[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#667085] mb-1.5">Mobile number</label>
                    <input
                      type="tel"
                      value={recipient.phone}
                      onChange={e => setRecipient(p => ({ ...p, phone: e.target.value }))}
                      placeholder={PHONE_PLACEHOLDERS[toCountry.code] ?? '+XX XXX XXX XXXX'}
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#667085] mb-1.5">Bank name</label>
                    <input
                      type="text"
                      value={recipient.bankName}
                      onChange={e => setRecipient(p => ({ ...p, bankName: e.target.value }))}
                      placeholder="e.g. Zenith Bank, Equity Bank"
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#667085] mb-1.5">Account number</label>
                    <input
                      type="text"
                      value={recipient.bankAccount}
                      onChange={e => setRecipient(p => ({ ...p, bankAccount: e.target.value }))}
                      placeholder="Bank account number"
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 bg-[#EAF2FF] rounded-xl p-3 text-xs text-[#1326FD] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              We verify the recipient&apos;s details before processing. Your money is protected.
            </div>

            <button
              onClick={() => setStep('payment')}
              disabled={!recipient.name || (deliveryMethod === 'mobile_money' ? !recipient.phone : !recipient.bankAccount)}
              className="w-full mt-5 py-3.5 rounded-xl bg-[#1326FD] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0D1DBD] transition-colors disabled:bg-[#D0D5DD] disabled:text-[#98A2B3] disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step: Payment */}
        {step === 'payment' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] animate-fadeIn">
            <button onClick={() => setStep('recipient')} className="flex items-center gap-1.5 text-sm text-[#667085] hover:text-gray-900 mb-5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-bold text-gray-900 text-lg mb-5">How do you want to pay?</h2>

            <div className="space-y-2 mb-6">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    paymentMethod === pm.id
                      ? 'border-[#1326FD] bg-[#EAF2FF]'
                      : 'border-[#E5E7EB] hover:border-[#D0D5DD]'
                  }`}
                >
                  <span className="text-2xl">{pm.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900">{pm.name}</div>
                    <div className="text-xs text-[#667085]">{pm.desc}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    paymentMethod === pm.id ? 'border-[#1326FD]' : 'border-[#D0D5DD]'
                  }`}>
                    {paymentMethod === pm.id && <div className="w-2.5 h-2.5 rounded-full bg-[#1326FD]" />}
                  </div>
                </button>
              ))}
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-3 mb-5 p-4 bg-[#F7F8FA] rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-[#667085] mb-1.5">Card number</label>
                  <input type="text" placeholder="0000 0000 0000 0000" maxLength={19}
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent bg-white font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#667085] mb-1.5">Expiry</label>
                    <input type="text" placeholder="MM / YY" maxLength={7}
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#667085] mb-1.5">CVC</label>
                    <input type="text" placeholder="000" maxLength={4}
                      className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#1326FD] focus:border-transparent bg-white font-mono" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('review')}
              className="w-full py-3.5 rounded-xl bg-[#1326FD] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0D1DBD] transition-colors"
            >
              Review transfer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] animate-fadeIn">
            <button onClick={() => setStep('payment')} className="flex items-center gap-1.5 text-sm text-[#667085] hover:text-gray-900 mb-5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-bold text-gray-900 text-lg mb-5">Review your transfer</h2>

            <div className="space-y-3 mb-6">
              <div className="bg-[#F7F8FA] rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#667085]">You send</span>
                  <span className="font-bold text-gray-900 text-base">{fromSym}{sendAmount} {fromCountry.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Transfer fee</span>
                  <span className="font-medium text-gray-900">{fromSym}{fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Exchange rate</span>
                  <span className="font-medium text-gray-900">1 {fromCountry.currency} = {rate.toLocaleString()} {toCountry.currency}</span>
                </div>
                <div className="border-t border-[#E5E7EB] pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Recipient gets</span>
                  <span className="font-bold text-[#008F5A] text-lg">{toSym}{Number(receives).toLocaleString()} {toCountry.currency}</span>
                </div>
              </div>

              <div className="bg-[#F7F8FA] rounded-xl p-4 text-sm space-y-2">
                <div className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-2 text-[#667085]">Recipient</div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Name</span>
                  <span className="font-medium text-gray-900">{recipient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Country</span>
                  <span className="font-medium text-gray-900">{toCountry.flag} {toCountry.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Delivery</span>
                  <span className="font-medium text-gray-900">
                    {deliveryMethod === 'mobile_money'
                      ? `📱 ${PROVIDER_NAMES[mobileProvider] ?? mobileProvider}`
                      : `🏦 ${recipient.bankName}`}
                  </span>
                </div>
                {deliveryMethod === 'mobile_money' && recipient.phone && (
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Phone</span>
                    <span className="font-medium text-gray-900">{recipient.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#667085]">Payment via</span>
                  <span className="font-medium text-gray-900 capitalize">{paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#008F5A] bg-[#E8F8F1] px-3 py-2.5 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                Money-back guarantee if transfer fails
              </div>
            </div>

            {(rateChanged || feeChanged || repeatWarnings.length > 0) && (
              <div className="space-y-2 mb-4">
                {rateChanged && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Exchange rate has changed: was 1 {fromCountry.currency} = {origRate?.toLocaleString()} {toCountry.currency}, now {rate.toLocaleString()}</span>
                  </div>
                )}
                {feeChanged && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Fee has changed: was {fromSym}{origFee?.toFixed(2)}, now {fromSym}{fee.toFixed(2)}</span>
                  </div>
                )}
                {repeatWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={submitTransfer}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#1326FD] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0D1DBD] transition-colors disabled:bg-[#D0D5DD] disabled:text-[#98A2B3] disabled:cursor-not-allowed"
            >
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</> : <>Confirm &amp; send {fromSym}{total}</>}
            </button>

            <p className="text-center text-xs text-[#98A2B3] mt-3">
              By confirming you agree to our Terms of Service
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1326FD]/20 border-t-[#1326FD] rounded-full animate-spin" />
      </div>
    }>
      <SendPageContent />
    </Suspense>
  )
}
