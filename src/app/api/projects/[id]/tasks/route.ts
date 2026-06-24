import { NextRequest, NextResponse } from 'next/server'
import { getSession, PLAN_LIMITS } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

async function ownsProject(projectId: string, userId: string) {
  return !!db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, userId)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await ownsProject(id, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
  const count = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.user_id = ?
  `).get(user.id) as { c: number }).c

  if (count >= limits.tasks) {
    return NextResponse.json({
      error: `Your ${user.plan} plan allows up to ${limits.tasks} tasks. Upgrade for more.`,
      upgrade: true
    }, { status: 403 })
  }

  const { title, owner, start_date, end_date, status, notes } = await req.json()
  if (!title || !owner || !start_date) {
    return NextResponse.json({ error: 'title, owner, and start_date are required' }, { status: 400 })
  }

  const taskId = nanoid()
  db.prepare(
    'INSERT INTO tasks (id, project_id, title, owner, start_date, end_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(taskId, id, title, owner, start_date, end_date ?? null, status ?? 'Planned', notes ?? '')

  db.prepare('UPDATE projects SET updated_at = unixepoch() WHERE id = ?').run(id)

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
  return NextResponse.json({ task }, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await ownsProject(id, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { id: taskId, title, owner, start_date, end_date, status, notes } = await req.json()
  db.prepare(
    'UPDATE tasks SET title=?, owner=?, start_date=?, end_date=?, status=?, notes=?, updated_at=unixepoch() WHERE id=? AND project_id=?'
  ).run(title, owner, start_date, end_date ?? null, status, notes ?? '', taskId, id)

  db.prepare('UPDATE projects SET updated_at = unixepoch() WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!await ownsProject(id, user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { taskId } = await req.json()
  db.prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?').run(taskId, id)
  db.prepare('UPDATE projects SET updated_at = unixepoch() WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
