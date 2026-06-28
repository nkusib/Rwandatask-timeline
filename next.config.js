/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const cspDirectives = [
  "default-src 'self'",
  // unsafe-eval only in dev (Next.js HMR requires it); nonce-based in prod would be ideal
  // but requires middleware — unsafe-inline is acceptable given httpOnly cookies + SameSite
  isProd
    ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  [
    "connect-src 'self'",
    "https://api.resend.com",          // email
    "https://api.stripe.com",          // payment
    "https://api.opensanctions.org",   // AML screening
    isProd ? '' : 'ws://localhost:3000 http://localhost:3000', // HMR websocket
  ].filter(Boolean).join(' '),
  "media-src 'self' blob:",            // camera / liveness video
  "worker-src blob:",                   // WebAuthn platform auth may use workers
  "frame-src https://js.stripe.com",   // Stripe 3DS iframe
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].filter(Boolean)

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // 2-year HSTS with preload — only set in production to avoid breaking localhost HTTPS
  ...(isProd ? [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  }] : []),
  {
    key: 'Permissions-Policy',
    // camera: needed for KYC liveness/ID capture
    // payment: needed for Stripe payment request API
    value: 'camera=(self), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
]

const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async redirects() {
    return []
  },
}

module.exports = nextConfig
