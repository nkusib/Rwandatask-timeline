import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createToken, setSessionCookie } from '@/lib/auth'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const id = nanoid()
    const hash = await bcrypt.hash(password, 10)

    db.prepare(
      'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)'
    ).run(id, email.toLowerCase().trim(), name.trim(), hash)

    const projectId = nanoid()
    db.prepare(
      'INSERT INTO projects (id, user_id, name, description) VALUES (?, ?, ?, ?)'
    ).run(projectId, id, 'My First Project', 'Sample project to get you started')

    const today = new Date().toISOString().split('T')[0]
    const tasks = [
      { title: 'Kickoff meeting', owner: name, start: today, end: addDaysStr(today, 1), status: 'Done' },
      { title: 'Requirements gathering', owner: name, start: addDaysStr(today, 1), end: addDaysStr(today, 5), status: 'In Progress' },
      { title: 'Design & prototyping', owner: name, start: addDaysStr(today, 4), end: addDaysStr(today, 12), status: 'Planned' },
      { title: 'Development sprint', owner: name, start: addDaysStr(today, 10), end: addDaysStr(today, 25), status: 'Planned' },
    ]
    for (const t of tasks) {
      db.prepare(
        'INSERT INTO tasks (id, project_id, title, owner, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(nanoid(), projectId, t.title, t.owner, t.start, t.end, t.status)
    }

    const token = await createToken(id)
    const res = NextResponse.json({ ok: true })
    res.cookies.set(setSessionCookie(token))
    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function addDaysStr(d: string, n: number) {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}
