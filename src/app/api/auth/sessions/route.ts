import { NextRequest, NextResponse } from 'next/server'
import { getSession, listActiveSessions, revokeAllSessions, verifyToken, clearSessionCookie, revokeSession } from '@/lib/auth'

// GET — list active sessions for the authenticated user
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessions = listActiveSessions(user.id)
  return NextResponse.json({ sessions })
}

// POST — revoke all sessions and sign out everywhere
export async function POST(req: NextRequest) {
  const token = req.cookies.get('rf_session')?.value
  if (!token) return NextResponse.redirect(new URL('/auth/login', req.url))

  const verified = await verifyToken(token)
  if (!verified) return NextResponse.redirect(new URL('/auth/login', req.url))

  revokeAllSessions(verified.userId)

  const res = NextResponse.redirect(new URL('/auth/login', req.url))
  res.cookies.set(clearSessionCookie())
  return res
}

// DELETE — revoke a specific session by ID (body: { sessionId })
export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  // Verify the session belongs to this user before revoking
  const { db } = await import('@/lib/db')
  const owns = db.prepare('SELECT id FROM user_sessions WHERE session_id = ? AND user_id = ?').get(sessionId, user.id)
  if (!owns) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  revokeSession(sessionId)
  return NextResponse.json({ ok: true })
}
