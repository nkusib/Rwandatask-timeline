import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { userId, plan } = session.metadata ?? {}
      if (userId && plan) {
        db.prepare(`
          UPDATE users SET plan = ?, subscription_status = 'active',
          stripe_subscription_id = ? WHERE id = ?
        `).run(plan, session.subscription as string, userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const { userId, plan } = sub.metadata ?? {}
      if (userId) {
        db.prepare(`
          UPDATE users SET subscription_status = ?, plan = ?
          WHERE id = ?
        `).run(sub.status, plan || 'free', userId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { userId } = sub.metadata ?? {}
      if (userId) {
        db.prepare(`
          UPDATE users SET plan = 'free', subscription_status = 'inactive',
          stripe_subscription_id = NULL WHERE id = ?
        `).run(userId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      db.prepare(`
        UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = ?
      `).run(customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
