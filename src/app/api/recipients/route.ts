import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recipients = db.prepare(
    'SELECT * FROM recipients WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id)

  return NextResponse.json(recipients)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, country, paymentMethod, mobileNumber, mobileProvider, bankAccount, bankName, iban } = body

  if (!name || !country || !paymentMethod) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const colors = ['#0070F3', '#059669', '#0284c7', '#d97706', '#dc2626', '#7C3AED']
  const color = colors[Math.floor(Math.random() * colors.length)]

  const id = nanoid()
  db.prepare(`
    INSERT INTO recipients (id, user_id, name, country, payment_method, mobile_number, mobile_provider, bank_account, bank_name, iban, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user.id, name, country, paymentMethod, mobileNumber ?? null, mobileProvider ?? null, bankAccount ?? null, bankName ?? null, iban ?? null, color)

  return NextResponse.json({ id })
}
