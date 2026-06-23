import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  const sessionUser = session?.user as any
  const { id } = await params
  const userId = Number(id)

  // Owner can edit anyone; non-owner can only edit themselves
  if (sessionUser?.role !== 'owner' && String(sessionUser?.id) !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { display_name, email, role, password } = await req.json()

  const updates: string[] = []
  const args: Record<string, unknown> = { id: userId }

  if (display_name !== undefined) {
    const [row] = await sql`UPDATE app_users SET display_name = ${display_name} WHERE id = ${userId} RETURNING id`
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (email !== undefined) {
    await sql`UPDATE app_users SET email = ${email || null} WHERE id = ${userId}`
  }
  if (role !== undefined && sessionUser?.role === 'owner') {
    await sql`UPDATE app_users SET role = ${role} WHERE id = ${userId}`
  }
  if (password) {
    const hash = await bcrypt.hash(password, 12)
    await sql`UPDATE app_users SET password_hash = ${hash} WHERE id = ${userId}`
  }

  const [updated] = await sql`
    SELECT id, username, display_name, email, role, created_at FROM app_users WHERE id = ${userId}
  `
  return NextResponse.json(updated)
}
