import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { PLANS } from '@/lib/stripe'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import UpgradeButton from './UpgradeButton'
import PortalButton from './PortalButton'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const sp = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-500 mb-8">Manage your plan and payment details.</p>

        {sp.success && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Subscription activated! You now have access to all {user.plan} features.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Current plan</h2>
              <p className="text-sm text-gray-500">Your subscription details</p>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-gray-900 capitalize">{user.plan}</div>
              <div className="text-sm text-gray-400 capitalize">{user.subscription_status || 'active'}</div>
            </div>
          </div>
          {user.plan !== 'free' && user.stripe_customer_id && (
            <PortalButton />
          )}
        </div>

        {user.plan === 'free' ? (
          <div>
            <h2 className="font-bold text-gray-900 mb-4">Upgrade your plan</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(PLANS).map(([key, plan]) => (
                <div key={key} className={`bg-white rounded-2xl border p-6 flex flex-col ${key === 'pro' ? 'border-brand-400 ring-2 ring-brand-400' : 'border-gray-200'}`}>
                  <div className="mb-4">
                    <div className="font-bold text-gray-900 text-lg">{plan.name}</div>
                    <div className="text-2xl font-bold mt-1">${plan.price}<span className="text-sm font-normal text-gray-400">/mo</span></div>
                    <div className="text-xs text-brand-600 mt-1">14-day free trial</div>
                  </div>
                  <ul className="space-y-2 flex-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <UpgradeButton plan={key} label={`Start ${plan.name} trial`} highlighted={key === 'pro'} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-1">You&apos;re on the {user.plan} plan</h2>
            <p className="text-sm text-gray-500 mb-4">To change or cancel your subscription, use the customer portal above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
