import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lines = await sql`
    SELECT
      COALESCE(resolved_name, raw_item_name) AS item_name,
      quantity,
      unit_price,
      item_total,
      usage_unit
    FROM bill_lines
    WHERE bill_id = ${Number(id)}
    ORDER BY id
  `
  return NextResponse.json(lines)
}
