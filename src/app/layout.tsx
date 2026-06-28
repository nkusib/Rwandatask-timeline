import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RemitFlow — Send Money to Africa Fast & Cheap',
  description: 'Send money from Europe and USA to 20+ African countries. Bank transfer, mobile money (MTN, M-Pesa, Airtel, Orange). FCA regulated. Best exchange rates.',
  keywords: 'remittance, send money to Africa, mobile money, MTN, M-Pesa, Airtel, bank transfer, Nigeria, Kenya, Ghana, exchange rates',
  openGraph: {
    title: 'RemitFlow — Faster, cheaper money transfers to Africa',
    description: 'Send money to 20+ African countries. Mobile money, bank transfer. FCA regulated.',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RemitFlow',
  },
}

export const viewport: Viewport = {
  themeColor: '#0070F3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
