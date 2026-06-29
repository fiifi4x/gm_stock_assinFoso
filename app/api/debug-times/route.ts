import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if ((session?.user as any)?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const [receiptCols, staffCols, receiptSample, staffSample, missing, missingSimple] = await Promise.all([
      sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales_receipts' AND column_name LIKE '%date%'`,
      sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff_times' AND column_name LIKE '%date%'`,
      sql`SELECT receipt_date, receipt_date::text AS raw FROM sales_receipts ORDER BY receipt_date DESC LIMIT 5`,
      sql`SELECT work_date, work_date::text AS raw, actual_in FROM staff_times ORDER BY work_date DESC LIMIT 5`,
      sql`
        SELECT DISTINCT receipt_date::date::text AS missing_date
        FROM sales_receipts sr
        WHERE sr.receipt_date::date < CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM staff_times st
            WHERE st.work_date = sr.receipt_date::date
              AND st.actual_in IS NOT NULL
          )
        ORDER BY missing_date DESC
        LIMIT 20
      `,
      sql`SELECT COUNT(*) AS total_receipts, COUNT(DISTINCT receipt_date::date) AS distinct_days FROM sales_receipts`,
    ])
    return NextResponse.json({ receiptCols, staffCols, receiptSample, staffSample, missing, missingSimple })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack })
  }
}
