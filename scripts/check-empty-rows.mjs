import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

const item = await sql`SELECT id, canonical_name FROM items WHERE canonical_name ILIKE '%hdmi%1.5%' LIMIT 5`
console.log('HDMI 1.5m items:', JSON.stringify(item))
if (!item.length) { console.log('Not found'); process.exit() }
const itemId = item[0].id

const allDates = await sql`
  WITH all_dates AS (
    SELECT item_id, count_date::date AS d FROM stock_counts WHERE item_id = ${itemId}
    UNION
    SELECT srl.item_id, sr.receipt_date::date FROM sales_receipt_lines srl JOIN sales_receipts sr ON sr.id = srl.receipt_id WHERE srl.item_id = ${itemId}
    UNION
    SELECT bl.item_id, b.bill_date::date FROM bill_lines bl JOIN bills b ON b.id = bl.bill_id WHERE bl.item_id = ${itemId}
  )
  SELECT ad.d::text,
    (SELECT SUM(quantity_counted) FROM stock_counts WHERE item_id=${itemId} AND count_date::date=ad.d) AS cnt,
    (SELECT SUM(srl.quantity) FROM sales_receipt_lines srl JOIN sales_receipts sr ON sr.id=srl.receipt_id WHERE srl.item_id=${itemId} AND sr.receipt_date::date=ad.d) AS sales,
    (SELECT SUM(bl.quantity) FROM bill_lines bl JOIN bills b ON b.id=bl.bill_id WHERE bl.item_id=${itemId} AND b.bill_date::date=ad.d) AS bills
  FROM all_dates ad ORDER BY ad.d
`

const trueEmpty = allDates.filter(r => !r.cnt && !r.sales && !r.bills)
console.log(`\nTotal date rows: ${allDates.length}`)
console.log(`Rows with NO data at all: ${trueEmpty.length}`)
if (trueEmpty.length) console.log('Empty dates:', trueEmpty.map(r => r.d).join(', '))

// Find out which table sources these phantom dates
for (const emptyDate of trueEmpty.slice(0, 3)) {
  const d = emptyDate.d
  const sc = await sql`SELECT id, quantity_counted FROM stock_counts WHERE item_id=${itemId} AND count_date::date=${d}`
  const sr = await sql`SELECT srl.id, srl.quantity, sr.receipt_date FROM sales_receipt_lines srl JOIN sales_receipts sr ON sr.id=srl.receipt_id WHERE srl.item_id=${itemId} AND sr.receipt_date::date=${d}`
  const bl = await sql`SELECT bl.id, bl.quantity, b.bill_date FROM bill_lines bl JOIN bills b ON b.id=bl.bill_id WHERE bl.item_id=${itemId} AND b.bill_date::date=${d}`
  console.log(`\nDate ${d}: sc=${JSON.stringify(sc)} sr=${JSON.stringify(sr)} bl=${JSON.stringify(bl)}`)
}
