import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })

  const rows = await sql`
    SELECT
      i.id AS item_id,
      i.canonical_name,
      i.cf_group,
      JSON_AGG(
        JSON_BUILD_OBJECT('name', bl.raw_item_name, 'cnt', bl.cnt)
        ORDER BY bl.cnt DESC
      ) AS raw_names
    FROM (
      SELECT item_id, raw_item_name, COUNT(*)::int AS cnt
      FROM bill_lines
      WHERE source = 'zoho_historical' AND item_id IS NOT NULL
      GROUP BY item_id, raw_item_name
    ) bl
    JOIN items i ON i.id = bl.item_id
    GROUP BY i.id, i.canonical_name, i.cf_group
    ORDER BY i.cf_group NULLS LAST, i.canonical_name
  `

  return NextResponse.json(rows)
}
