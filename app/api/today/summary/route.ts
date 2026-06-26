import sql from '@/lib/db'
import { NextResponse } from 'next/server'

const DAILY_ITEM_IDS = [367, 368, 369, 370, 371, 372, 373, 374, 375, 376]

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const [
      salesToday,
      billsToday,
      expensesToday,
      pendingDaily,
      staffToday,
      latestCab,
    ] = await Promise.all([
      sql`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(total), 0) AS total,
          COALESCE(SUM(CASE WHEN customer_name IS DISTINCT FROM 'Grony Multimedia as Customer' THEN total ELSE 0 END), 0) AS wic,
          COALESCE(SUM(CASE WHEN customer_name = 'Grony Multimedia as Customer' THEN total ELSE 0 END), 0) AS gmc
        FROM sales_receipts WHERE receipt_date::date = ${today}
      `,
      sql`SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total FROM bills WHERE bill_date::date = ${today}`,
      sql`SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date::date = ${today}`,
      sql`
        SELECT COUNT(*) AS count
        FROM item_stock_summary s
        LEFT JOIN (
          SELECT item_id, MAX(count_date) AS last_count_date FROM stock_counts GROUP BY item_id
        ) c ON c.item_id = s.item_id
        WHERE s.item_id = ANY(${DAILY_ITEM_IDS})
          AND (c.last_count_date IS NULL OR c.last_count_date::date < CURRENT_DATE)
      `,
      sql`SELECT staff_name, actual_in, actual_out FROM staff_times WHERE work_date = ${today} AND staff_name <> '__shop_open__' ORDER BY staff_name`,
      sql`SELECT entry_date, cab_total, deficit FROM cash_at_bank_view WHERE cab_total IS NOT NULL ORDER BY entry_date DESC LIMIT 1`,
    ])

    return NextResponse.json({
      date: today,
      sales: salesToday[0],
      bills: billsToday[0],
      expenses: expensesToday[0],
      pendingDailyCount: Number(pendingDaily[0]?.count ?? 0),
      staffToday,
      latestCab: latestCab[0] ?? null,
    })
  } catch (e) {
    console.error('today summary error:', e)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}
