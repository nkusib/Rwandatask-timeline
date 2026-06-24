import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export const PLANS = {
  pro: {
    name: 'Pro',
    price: 19,
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    features: [
      'Unlimited projects',
      'Unlimited tasks',
      'CSV & PDF export',
      'Shareable links',
      'Priority support',
      'Custom colors & themes',
    ],
  },
  team: {
    name: 'Team',
    price: 49,
    priceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || '',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Real-time collaboration',
      'Comments & mentions',
      'Role-based permissions',
      'Activity log',
    ],
  },
  business: {
    name: 'Business',
    price: 199,
    priceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || '',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'SSO / SAML',
      'REST API access',
      'White-label option',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
}
