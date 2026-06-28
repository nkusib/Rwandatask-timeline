import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import type { Transaction } from '@/lib/db'
import { CURRENCIES, TRANSACTION_STATUS_LABELS } from '@/lib/constants'

const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', TZ: '🇹🇿', ZA: '🇿🇦',
  UG: '🇺🇬', SN: '🇸🇳', CI: '🇨🇮', CM: '🇨🇲', MA: '🇲🇦', ET: '🇪🇹', ZM: '🇿🇲',
}

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const { id } = await params
  const txn = db.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ?'
  ).get(id, user.id) as Transaction | undefined

  if (!txn) notFound()

  const sendCur = CURRENCIES[txn.send_currency as keyof typeof CURRENCIES]
  const recCur = CURRENCIES[txn.receive_currency as keyof typeof CURRENCIES]
  const st = TRANSACTION_STATUS_LABELS[txn.status]

  const StatusIcon = {
    completed: CheckCircle,
    processing: RefreshCw,
    pending: Clock,
    failed: XCircle,
    cancelled: XCircle,
  }[txn.status] ?? Clock

  const statusIconColor = {
    completed: 'text-emerald-500',
    processing: 'text-blue-500',
    pending: 'text-amber-500',
    failed: 'text-red-500',
    cancelled: 'text-gray-400',
  }[txn.status] ?? 'text-gray-400'

  const recipientDetails = (() => {
    try { return JSON.parse(txn.recipient_details ?? '{}') }
    catch { return {} }
  })()

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/transactions" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <span className="font-bold text-gray-900">Transfer details</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
          <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${st?.bg ?? 'bg-gray-100'}`}>
            <StatusIcon className={`w-7 h-7 ${statusIconColor} ${txn.status === 'processing' ? 'animate-spin' : ''}`} />
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3 ${st?.bg} ${st?.color}`}>
            {st?.label ?? txn.status}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {sendCur?.symbol}{txn.send_amount.toFixed(2)} {txn.send_currency}
          </div>
          <div className="text-emerald-600 font-semibold mb-1">
            → {recCur?.symbol}{Number(txn.receive_amount).toLocaleString()} {txn.receive_currency}
          </div>
          {txn.estimated_delivery && txn.status !== 'completed' && (
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5" />
              {txn.estimated_delivery}
            </div>
          )}
          {txn.status === 'completed' && txn.completed_at && (
            <div className="text-xs text-emerald-600 mt-2">
              Completed {new Date(txn.completed_at * 1000).toLocaleString()}
            </div>
          )}
        </div>

        {/* Recipient */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Recipient</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#0D1DBD] font-bold">
              {txn.recipient_name?.charAt(0) ?? '?'}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{txn.recipient_name}</div>
              <div className="text-sm text-gray-500">
                {txn.recipient_country && COUNTRY_FLAGS[txn.recipient_country]}{' '}
                {txn.recipient_country}
              </div>
            </div>
          </div>
          {txn.delivery_method === 'mobile_money' ? (
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Provider</span>
                <span className="font-medium text-gray-900 capitalize">{recipientDetails.provider?.replace('_', ' ')}</span>
              </div>
              {recipientDetails.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-gray-900">{recipientDetails.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
              {recipientDetails.bankName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank</span>
                  <span className="font-medium text-gray-900">{recipientDetails.bankName}</span>
                </div>
              )}
              {recipientDetails.account && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Account</span>
                  <span className="font-medium font-mono text-gray-900">{recipientDetails.account}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transfer details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Transfer details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono text-xs text-gray-900">{txn.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Exchange rate</span>
              <span className="text-gray-900">1 {txn.send_currency} = {txn.exchange_rate.toLocaleString()} {txn.receive_currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transfer fee</span>
              <span className="text-gray-900">{sendCur?.symbol}{txn.fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span className="text-gray-900 capitalize">{txn.payment_method?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery method</span>
              <span className="text-gray-900">{txn.delivery_method === 'mobile_money' ? '📱 Mobile money' : '🏦 Bank deposit'}</span>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-bold text-gray-900">Total paid</span>
              <span className="font-bold text-gray-900">{sendCur?.symbol}{txn.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {txn.status === 'completed' ? (
            <Link
              href={`/send?from_transaction=${txn.id}`}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: '#1326FD' }}
            >
              Send again
            </Link>
          ) : (
            <span className="flex items-center justify-center py-3 rounded-xl font-semibold text-sm bg-gray-100 text-gray-400 cursor-not-allowed">
              Cannot repeat
            </span>
          )}
          <Link href="/transactions" className="block py-3 rounded-xl font-semibold text-sm text-center border border-gray-200 text-gray-700 hover:bg-gray-50">
            Back to history
          </Link>
        </div>
      </main>
    </div>
  )
}
