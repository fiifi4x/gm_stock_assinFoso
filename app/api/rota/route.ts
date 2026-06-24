import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  if (!year || !month) return NextResponse.json({ error: 'year and month required' }, { status: 400 })

  const rows = await sql`
    SELECT id, staff_name, rota_date::text AS rota_date, sched_in, sched_out, is_off, role
    FROM staff_rota
    WHERE EXTRACT(YEAR FROM rota_date) = ${year}
      AND EXTRACT(MONTH FROM rota_date) = ${month}
    ORDER BY rota_date, staff_name
  `
  return NextResponse.json(rows)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, sched_in, sched_out, is_off, role } = await req.json()
  const row = await sql`
    UPDATE staff_rota SET sched_in=${sched_in||null}, sched_out=${sched_out||null},
      is_off=${is_off??false}, role=${role||null}
    WHERE id=${id}
    RETURNING id, staff_name, rota_date::text AS rota_date, sched_in, sched_out, is_off, role
  `
  return NextResponse.json(row[0])
}
