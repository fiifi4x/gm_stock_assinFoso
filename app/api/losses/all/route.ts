import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const rows = await sql`
    WITH all_dates AS (
      SELECT item_id, count_date::date AS d FROM stock_counts
      UNION
      SELECT srl.item_id, sr.receipt_date::date
        FROM sales_receipt_lines srl
        JOIN sales_receipts sr ON sr.id = srl.receipt_id
      UNION
      SELECT bl.item_id, b.bill_date::date
        FROM bill_lines bl
        JOIN bills b ON b.id = bl.bill_id
    ),
    daily_counts AS (
      SELECT item_id, count_date::date AS d, SUM(quantity_counted) AS qty_counted
      FROM stock_counts
      GROUP BY item_id, count_date::date
    ),
    daily_wic AS (
      SELECT srl.item_id, sr.receipt_date::date AS d, SUM(srl.quantity) AS qty
      FROM sales_receipt_lines srl
      JOIN sales_receipts sr ON sr.id = srl.receipt_id
      WHERE (sr.customer_name IS NULL OR sr.customer_name <> 'Grony Multimedia as Customer')
      GROUP BY srl.item_id, sr.receipt_date::date
    ),
    daily_gmc AS (
      SELECT srl.item_id, sr.receipt_date::date AS d, SUM(srl.quantity) AS qty
      FROM sales_receipt_lines srl
      JOIN sales_receipts sr ON sr.id = srl.receipt_id
      WHERE sr.customer_name = 'Grony Multimedia as Customer'
      GROUP BY srl.item_id, sr.receipt_date::date
    ),
    daily_bills AS (
      SELECT bl.item_id, b.bill_date::date AS d, SUM(bl.quantity) AS qty
      FROM bill_lines bl
      JOIN bills b ON b.id = bl.bill_id
      GROUP BY bl.item_id, b.bill_date::date
    )
    SELECT
      ad.item_id,
      ad.d AS date,
      dc.qty_counted,
      dw.qty  AS wic_qty,
      dg.qty  AS gmc_qty,
      db.qty  AS bills_qty
    FROM all_dates ad
    LEFT JOIN daily_counts dc ON dc.item_id = ad.item_id AND dc.d = ad.d
    LEFT JOIN daily_wic    dw ON dw.item_id = ad.item_id AND dw.d = ad.d
    LEFT JOIN daily_gmc    dg ON dg.item_id = ad.item_id AND dg.d = ad.d
    LEFT JOIN daily_bills  db ON db.item_id = ad.item_id AND db.d = ad.d
    ORDER BY ad.item_id, ad.d ASC
  `
  return NextResponse.json(rows)
}
