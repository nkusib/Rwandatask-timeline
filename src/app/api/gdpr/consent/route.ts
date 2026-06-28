import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

const ALLOWED_PURPOSES = ['biometric_processing', 'marketing', 'data_sharing'] as const
type Purpose = typeof ALLOWED_PURPOSES[number]

// POST — record a consent grant or withdrawal
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const userAgent = req.headers.get('user-agent') || ''

  const { purpose, granted, policyVersion } = await req.json()

  if (!ALLOWED_PURPOSES.includes(purpose as Purpose)) {
    return NextResponse.json({ error: 'Invalid consent purpose' }, { status: 400 })
  }
  if (typeof granted !== 'boolean') {
    return NextResponse.json({ error: 'granted must be a boolean' }, { status: 400 })
  }

  db.prepare(`
    INSERT INTO gdpr_consents (id, user_id, purpose, granted, policy_version, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    nanoid(),
    user.id,
    purpose,
    granted ? 1 : 0,
    policyVersion ?? '1.0',
    ip,
    userAgent.slice(0, 255)
  )

  return NextResponse.json({ ok: true })
}

// GET — fetch current consent status for the authenticated user
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Latest grant per purpose
  const rows = db.prepare(`
    SELECT purpose, granted, policy_version, granted_at
    FROM gdpr_consents
    WHERE user_id = ?
    GROUP BY purpose
    HAVING granted_at = MAX(granted_at)
    ORDER BY granted_at DESC
  `).all(user.id) as { purpose: string; granted: number; policy_version: string; granted_at: number }[]

  const consents = Object.fromEntries(
    rows.map(r => [r.purpose, { granted: r.granted === 1, version: r.policy_version, at: r.granted_at }])
  )

  return NextResponse.json({ consents })
}
