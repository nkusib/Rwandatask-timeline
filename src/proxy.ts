import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'
)

const protectedRoutes = ['/dashboard', '/projects', '/billing', '/settings']
const authRoutes = ['/auth/login', '/auth/register']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))
  const isAuthRoute = authRoutes.some(r => pathname.startsWith(r))

  const token = req.cookies.get('ttp_session')?.value

  let isAuthenticated = false
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      isAuthenticated = true
    } catch {}
  }

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next\/static|_next\/image|favicon\.ico).*)'],
}
