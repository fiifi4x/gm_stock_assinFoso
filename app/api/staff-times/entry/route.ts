import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { logActivity } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { staff_name, work_date, actual_in, actual_out } = await req.json()
  if (!staff_name || !work_date || !actual_in) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const enteredBy = session.user?.name || (session.user as any)?.username || null

  await sql`
    INSERT INTO staff_times (staff_name, work_date, actual_in, actual_out, entered_by)
    VALUES (${staff_name}, ${work_date}, ${actual_in}, ${actual_out ?? null}, ${enteredBy})
    ON CONFLICT (staff_name, work_date)
    DO UPDATE SET actual_in = ${actual_in}, actual_out = ${actual_out ?? null}, entered_by = ${enteredBy}
  `

  await logActivity(enteredBy ?? 'Unknown', 'entered time', `${staff_name} · in ${actual_in}${actual_out ? ` out ${actual_out}` : ''} on ${work_date}`)
  return NextResponse.json({ ok: true })
}
