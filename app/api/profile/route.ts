import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const sessionUser = session?.user as any
  if (!sessionUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await sql`
    SELECT id, username, display_name, email, phone, role, created_at
    FROM app_users WHERE id = ${sessionUser.id}
  `
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  const sessionUser = session?.user as any
  if (!sessionUser?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name, email, phone, password, confirm } = await req.json()

  if (password) {
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    if (password !== confirm) return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    const hash = await bcrypt.hash(password, 12)
    await sql`UPDATE app_users SET password_hash = ${hash} WHERE id = ${sessionUser.id}`
  }

  await sql`
    UPDATE app_users
    SET display_name = ${display_name},
        email = ${email || null},
        phone = ${phone || null}
    WHERE id = ${sessionUser.id}
  `

  const [updated] = await sql`
    SELECT id, username, display_name, email, phone, role, created_at
    FROM app_users WHERE id = ${sessionUser.id}
  `
  return NextResponse.json(updated)
}
