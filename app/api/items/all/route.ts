import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })
  const rows = await sql`
    SELECT i.id, i.canonical_name AS name, i.cf_group AS "group",
           COALESCE(s.calculated_soh, 0) AS soh,
           COALESCE(i.selling_price, 0) AS selling_price
    FROM items i
    LEFT JOIN item_stock_summary s ON s.item_id = i.id
    WHERE i.status NOT IN ('inactive','service')
    ORDER BY i.canonical_name
  `
  return NextResponse.json(rows)
}
