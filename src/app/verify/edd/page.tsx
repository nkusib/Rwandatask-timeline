'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'

const DOC_TYPES = [
  { value: 'utility_bill', label: 'Utility bill', desc: 'Gas, electricity, water (dated within 3 months)' },
  { value: 'bank_statement', label: 'Bank statement', desc: 'Official statement (dated within 3 months)' },
  { value: 'council_tax', label: 'Council tax letter', desc: 'Current year' },
  { value: 'hmrc_letter', label: 'HMRC letter', desc: 'Tax return or official correspondence' },
  { value: 'tenancy_agreement', label: 'Tenancy agreement', desc: 'Signed by landlord (dated within 12 months)' },
]

export default function EddPage() {
  const [docType, setDocType] = useState('utility_bill')
  const [capture, setCapture] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
    const reader = new FileReader()
    reader.onload = () => setCapture(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (!capture) { setError('Please upload a document'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/kyc/edd-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          documentRef: 'user_upload_' + Date.now(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Document submitted</h2>
          <p className="text-gray-500 text-sm mb-6">
            Our compliance team will review your document within 1-2 business days.
            You&apos;ll receive a notification once it&apos;s approved.
          </p>
          <Link href="/dashboard" className="block w-full py-3 rounded-xl text-white font-semibold text-sm" style={{ background: '#1326FD' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Proof of address</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Additional verification required.</strong> To continue at your current sending level, please upload a document proving your address. The document must be dated within 3 months.
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Upload proof of address</h2>
          <p className="text-gray-500 text-sm mb-5">Choose an accepted document type and upload a clear photo or scan.</p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Document type</label>
            <div className="space-y-2">
              {DOC_TYPES.map(d => (
                <label key={d.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${docType === d.value ? 'border-[#1326FD] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="docType" value={d.value} checked={docType === d.value}
                    onChange={() => setDocType(d.value)} className="accent-[#1326FD]" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{d.label}</div>
                    <div className="text-xs text-gray-500">{d.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {capture ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-4">
              {capture.startsWith('data:image') ? (
                <img src={capture} alt="Document" className="w-full max-h-64 object-contain bg-gray-50" />
              ) : (
                <div className="p-6 flex items-center gap-3 bg-gray-50">
                  <FileText className="w-8 h-8 text-[#1326FD]" />
                  <span className="text-sm font-medium text-gray-700">Document uploaded</span>
                </div>
              )}
              <button onClick={() => setCapture(null)}
                className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-xs font-medium text-gray-600 shadow hover:bg-gray-50">
                Change
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors mb-4">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-700">Click to upload document</div>
              <div className="text-xs text-gray-400 mt-1">JPG, PNG or PDF · Max 10MB</div>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />

          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 mb-5 space-y-1">
            <div className="font-medium text-gray-700 mb-1">Requirements:</div>
            <div>✓ Document must show your name and current address</div>
            <div>✓ Date must be within the last 3 months</div>
            <div>✓ All four corners must be visible</div>
            <div>✓ Text must be clearly readable (no blur or shadows)</div>
          </div>

          <button onClick={submit} disabled={!capture || submitting}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#1326FD' }}>
            {submitting
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Submit document'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Your document is handled in accordance with GDPR and stored securely.
        </p>
      </div>
    </div>
  )
}
