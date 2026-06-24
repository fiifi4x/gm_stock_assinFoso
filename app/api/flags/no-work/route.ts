import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { logActivity } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { work_date, reason } = await req.json()
  if (!work_date || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const actor = (session.user as any)?.username || session.user?.name || 'Unknown'

  await sql`
    INSERT INTO no_work_days (work_date, reason, recorded_by)
    VALUES (${work_date}, ${reason}, ${actor})
    ON CONFLICT (work_date) DO UPDATE SET reason = ${reason}, recorded_by = ${actor}
  `

  await logActivity(actor, 'marked no-work day', `${work_date} — ${reason}`)
  return NextResponse.json({ ok: true })
}
