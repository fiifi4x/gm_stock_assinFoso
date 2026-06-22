import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const rows = await sql`
    SELECT
      item_id,
      item_name,
      cf_group,
      calculated_soh,
      last_count_date,
      CASE
        WHEN last_count_date IS NULL THEN NULL
        ELSE (CURRENT_DATE - last_count_date::date - 15)
      END AS days_overdue
    FROM item_stock_summary
    WHERE last_count_date IS NULL
       OR last_count_date::date < CURRENT_DATE - INTERVAL '15 days'
    ORDER BY
      CASE WHEN last_count_date IS NULL THEN 999999
           ELSE (CURRENT_DATE - last_count_date::date)
      END DESC,
      item_name ASC
  `
  return NextResponse.json(rows)
}
