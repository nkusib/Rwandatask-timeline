import { NextRequest, NextResponse } from 'next/server'
import { getSession, PLAN_LIMITS } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = db.prepare(`
    SELECT p.*, COUNT(t.id) as task_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all(user.id)

  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
  const count = (db.prepare('SELECT COUNT(*) as c FROM projects WHERE user_id = ?').get(user.id) as { c: number }).c

  if (count >= limits.projects) {
    return NextResponse.json({
      error: `Your ${user.plan} plan allows up to ${limits.projects} project(s). Upgrade to create more.`,
      upgrade: true
    }, { status: 403 })
  }

  const { name, description, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const id = nanoid()
  db.prepare(
    'INSERT INTO projects (id, user_id, name, description, color) VALUES (?, ?, ?, ?, ?)'
  ).run(id, user.id, name.trim(), description?.trim() ?? '', color ?? '#0ea5e9')

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  return NextResponse.json({ project }, { status: 201 })
}
