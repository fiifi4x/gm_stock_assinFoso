import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const deleted = await sql`
    DELETE FROM staff_times WHERE work_date = '2026-06-25'
    RETURNING id, staff_name
  `
  return NextResponse.json({ deleted })
}
