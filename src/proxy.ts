import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'remitflow-secret-change-in-production-min-32-chars'
)
const COOKIE_NAME = 'rf_session'

const PROTECTED_ROUTES = ['/dashboard', '/send', '/transactions', '/recipients', '/verify', '/settings', '/billing', '/profile']
const ADMIN_ROUTES = ['/admin']
const AUTH_ROUTES = ['/auth/login', '/auth/register']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(COOKIE_NAME)?.value

  const isProtected = PROTECTED_ROUTES.some(p => pathname.startsWith(p))
  const isAdminRoute = ADMIN_ROUTES.some(p => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p))

  if (isAuthRoute && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    } catch {}
  }

  if (isProtected || isAdminRoute) {
    if (!token) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      if (isAdminRoute) {
        const role = payload.role as string | undefined
        if (!role || !['admin', 'super_admin'].includes(role)) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
    } catch {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('next', pathname)
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete(COOKIE_NAME)
      return res
    }
  }

  const res = NextResponse.next()
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=self, microphone=(), geolocation=(), payment=()')
  res.headers.set('X-XSS-Protection', '0')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/stripe).*)'],
}
