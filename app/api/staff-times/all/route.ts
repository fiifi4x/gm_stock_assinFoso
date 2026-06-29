import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await sql`
      SELECT id, staff_name, work_date::text, actual_in, actual_out,
             COALESCE(entered_by, '') AS entered_by
      FROM staff_times
      ORDER BY work_date DESC, staff_name
      LIMIT 500
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error('[staff-times/all]', e?.message)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
