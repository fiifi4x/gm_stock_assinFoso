import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const [assignments, settings] = await Promise.all([
      sql`SELECT violation_type, staff_name FROM violation_assignments`,
      sql`SELECT key, value FROM violation_settings`,
    ])
    const assignmentMap: Record<string, string> = {}
    for (const r of assignments) assignmentMap[r.violation_type] = r.staff_name
    const settingsMap: Record<string, string> = {}
    for (const r of settings) settingsMap[r.key] = r.value
    return NextResponse.json({ assignments: assignmentMap, settings: settingsMap })
  } catch (e) {
    console.error('violation assignments GET error:', e)
    return NextResponse.json({ assignments: {}, settings: {} })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { violation_type, staff_name, settings } = await req.json()

  if (violation_type) {
    if (staff_name) {
      await sql`
        INSERT INTO violation_assignments (violation_type, staff_name)
        VALUES (${violation_type}, ${staff_name})
        ON CONFLICT (violation_type) DO UPDATE SET staff_name = ${staff_name}
      `
    } else {
      await sql`DELETE FROM violation_assignments WHERE violation_type = ${violation_type}`
    }
  }

  if (settings && typeof settings === 'object') {
    for (const [key, value] of Object.entries(settings)) {
      await sql`
        INSERT INTO violation_settings (key, value) VALUES (${key}, ${String(value)})
        ON CONFLICT (key) DO UPDATE SET value = ${String(value)}
      `
    }
  }

  return NextResponse.json({ ok: true })
}
