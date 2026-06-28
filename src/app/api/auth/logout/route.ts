import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, clearSessionCookie, revokeSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('rf_session')?.value

  if (token) {
    const verified = await verifyToken(token)
    if (verified?.sessionId) {
      revokeSession(verified.sessionId)
    }
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  return res
}
