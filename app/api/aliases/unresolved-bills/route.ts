import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })

  const rows = await sql`
    SELECT raw_item_name AS name, COUNT(*)::int AS cnt
    FROM bill_lines
    WHERE item_id IS NULL OR unresolved = true
    GROUP BY raw_item_name
    ORDER BY COUNT(*) DESC
  `

  const confirmed = await sql`SELECT alias_name FROM item_aliases`
  const confirmedSet = new Set(confirmed.map((r: any) => r.alias_name.toLowerCase().trim()))

  return NextResponse.json(
    rows.map((r: any) => ({
      name: r.name,
      cnt: r.cnt,
      confirmed: confirmedSet.has(r.name.toLowerCase().trim()),
    }))
  )
}
