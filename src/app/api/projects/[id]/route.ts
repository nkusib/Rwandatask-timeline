import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

async function getProject(id: string, userId: string) {
  return db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, userId)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const project = await getProject(id, user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position, start_date').all(id)
  return NextResponse.json({ project, tasks })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const project = await getProject(id, user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, description, color } = await req.json()
  db.prepare(
    'UPDATE projects SET name = ?, description = ?, color = ?, updated_at = unixepoch() WHERE id = ?'
  ).run(name, description, color, id)

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const project = await getProject(id, user.id)
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return NextResponse.json({ ok: true })
}
