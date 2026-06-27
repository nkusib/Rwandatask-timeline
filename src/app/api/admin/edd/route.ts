import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

const VALID_DAYS = [30, 90]

export async function POST(req: NextRequest) {
  let admin
  try { admin = await requireAdmin() }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  try {
    const { userId, days, reason } = await req.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    if (!VALID_DAYS.includes(Number(days))) {
      return NextResponse.json({ error: 'days must be 30 or 90' }, { status: 400 })
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId) as
      { id: string; name: string; email: string } | undefined
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const deadlineTs = Math.floor(Date.now() / 1000) + Number(days) * 86400

    db.prepare(`
      UPDATE users
      SET edd_required = 1, edd_deadline = ?, edd_triggered_by = ?, updated_at = unixepoch()
      WHERE id = ?
    `).run(deadlineTs, admin.id, userId)

    db.prepare(`
      INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details)
      VALUES (?, ?, 'edd_triggered', 'user', ?, ?)
    `).run(nanoid(), admin.id, userId, JSON.stringify({ days, reason: reason || null }))

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'edd_required', 'Additional verification required',
        'To continue using RemitFlow at your current level, please submit proof of address within ${days} days. Go to Settings → Verify to upload your document.')
    `).run(nanoid(), userId)

    return NextResponse.json({ ok: true, deadline: deadlineTs, days })
  } catch (err) {
    console.error('[admin/edd]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Remove an EDD requirement (e.g. document accepted) */
export async function DELETE(req: NextRequest) {
  let admin
  try { admin = await requireAdmin() }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    db.prepare(`
      UPDATE users SET edd_required = 0, edd_deadline = NULL, edd_document_ref = NULL, updated_at = unixepoch()
      WHERE id = ?
    `).run(userId)

    db.prepare(`
      INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details)
      VALUES (?, ?, 'edd_cleared', 'user', ?, ?)
    `).run(nanoid(), admin.id, userId, JSON.stringify({}))

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'edd_cleared', 'Verification complete', 'Your additional verification has been accepted. Thank you!')
    `).run(nanoid(), userId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/edd DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
