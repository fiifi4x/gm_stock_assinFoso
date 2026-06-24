import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch { return fallback }
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })

  const [bills, sales, counts, expenses] = await Promise.all([
    safeFetch(async () => {
      const rows = await sql`
        SELECT
          'bill'          AS type,
          b.id,
          b.bill_date::text AS date,
          b.vendor_name   AS description,
          b.total::text   AS total,
          b.bill_number   AS ref,
          NULL            AS by,
          COUNT(bl.id)    AS item_count
        FROM bills b
        LEFT JOIN bill_lines bl ON bl.bill_id = b.id
        GROUP BY b.id, b.bill_date, b.vendor_name, b.total, b.bill_number
        ORDER BY b.bill_date DESC, b.id DESC
        LIMIT 300
      `
      return rows
    }, []),

    safeFetch(async () => {
      const rows = await sql`
        SELECT
          'sale'              AS type,
          sr.id,
          sr.receipt_date::text AS date,
          sr.customer_name    AS description,
          sr.total::text      AS total,
          sr.receipt_number   AS ref,
          NULL                AS by,
          COUNT(srl.id)       AS item_count
        FROM sales_receipts sr
        LEFT JOIN sales_receipt_lines srl ON srl.receipt_id = sr.id
        GROUP BY sr.id, sr.receipt_date, sr.customer_name, sr.total, sr.receipt_number
        ORDER BY sr.receipt_date DESC, sr.id DESC
        LIMIT 300
      `
      return rows
    }, []),

    safeFetch(async () => {
      const rows = await sql`
        SELECT
          'count'                         AS type,
          MIN(id)                         AS id,
          count_date::text                AS date,
          COALESCE(counted_by, 'Unknown') AS description,
          NULL                            AS total,
          NULL                            AS ref,
          counted_by                      AS by,
          COUNT(*)::int                   AS item_count
        FROM stock_counts
        GROUP BY count_date, counted_by
        ORDER BY count_date DESC
        LIMIT 200
      `
      return rows
    }, []),

    safeFetch(async () => {
      const rows = await sql`
        SELECT
          'expense'                                               AS type,
          id,
          expense_date::text                                      AS date,
          COALESCE(expense_account, cf_expense_type, 'Expense')  AS description,
          amount::text                                            AS total,
          NULL                                                    AS ref,
          entered_by                                              AS by,
          1                                                       AS item_count
        FROM expenses
        ORDER BY expense_date DESC, id DESC
        LIMIT 200
      `
      return rows
    }, []),
  ])

  // Merge and sort by date desc, id desc
  const all = [...bills, ...sales, ...counts, ...expenses].sort((a: any, b: any) => {
    const dateDiff = b.date.localeCompare(a.date)
    if (dateDiff !== 0) return dateDiff
    return (b.id as number) - (a.id as number)
  })

  return NextResponse.json(all)
}
