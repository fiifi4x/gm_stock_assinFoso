import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const rows = await sql`
    SELECT item_id, item_name, cf_group, calculated_soh
    FROM item_stock_summary
    WHERE item_name NOT ILIKE 'old stop%'
      AND item_name NOT ILIKE 'old- stop%'
      AND item_name NOT ILIKE 'service%'
      AND item_name NOT ILIKE 'service-%'
    ORDER BY item_name ASC
  `
  return NextResponse.json(rows)
}
