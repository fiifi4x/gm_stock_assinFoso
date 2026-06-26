import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

// Confirmed canonical -> [aliases] map, from Grony_Item_Service_Matching.xlsx
// (53 canonical items, 57 alias variants), manually reviewed and confirmed.
const ALIAS_MAP = {
  "05A/80A Toner Cartridge": ["StarInk 05A/80A Toner Cartridge"],
  "26A Toner Cartridge": ["StarInk 26A Toner Cartridge"],
  "4K HDMI CABLE 30M": ["4K HDMI 30M"],
  "87A Toner Cartridge": ["StarInk 87A Toner Cartridge"],
  "90A Toner Cartridge": ["StarInk 90A Toner Cartridge"],
  "A3 200 Double pack": ["A3 200 Double"],
  "A3 230 grams pack": ["A3 230 grams"],
  "A3 LAMINATION pack": ["A3 LAMINATION"],
  "A4 120 grams packs": ["A4 120 grams"],
  "A4 140 grams packs": ["A4 140 grams"],
  "A4 160 grams packs": ["A4 160 grams"],
  "A4 180 grams": ["old- stop- A4 180 singles"],
  "A4 230 grams pack": ["A4 230 grams"],
  "A4 260 One Side Singles for Inv. Cards": ["A4 260 D singles for Inv. Cards"],
  "A4 260 grams One Side packs": ["A4 260 grams S"],
  "A4 CARDBOARD RED": ["À4 CARDBOARD RED"],
  "A4 LAMINATION pack": ["A4 LAMINATION"],
  "DELL OPTICAL WIRELESS MOUSE": ["DELL OPTICAL WIRELESS"],
  "HDMI CABLE 10m": ["HDMI 10m"],
  "HDMI CABLE 20M": ["HDMI 20M"],
  "HDMI CABLE 30M": ["HDMI 30M"],
  "HP BIG PIN CHARGER": ["HP BIG PIN"],
  "HP BLUE MOUTH CHARGER": ["HP BLUE MOUTH"],
  "HP SMALL PIN CHARGER": ["HP SMALL PIN"],
  "Large Format 3ft banner": ["3ft. Sticker", "Large Format 3ft. banner"],
  "Large Format 3ft. Sticker": ["Large format 3ft Sticker"],
  "Notebook Adapter Charger": ["Notebook Adapter"],
  "PRINTER CABLE 3M": ["PRINTER CABLES 3M"],
  "SONY 19V CHARGER": ["SONY 19V"],
  "Service - A3 Photocopy (A3 sheet)": ["A3 Photocopy"],
  "Service - A4 Lamination": ["A4 Lamination Singles", "old- stop- A4 Lamination Singles"],
  "Service - A4 Picture Printing": ["A4 Picture Printing"],
  "Service - Camera Hire": ["Camera Hire"],
  "Service - Cartridge Refill": ["Cartridge Refill"],
  "Service - DOCUMENT EDITING": ["DOCUMENT EDITING"],
  "Service - Ghana Card copy": ["Ghana Card copy"],
  "Service - Invitation Cards": ["Invitation Cards"],
  "Service - Invoice Printing": ["Invoice Printing"],
  "Service - Online Reg. - University of Education Winneba": ["Online Reg. - University of Education Winneba"],
  "Service - Online Registration - Security Forces": ["Online Registration - Security Forces"],
  "Service - Online registration - Ghana Armed Forces": ["Online registration - Ghana Armed Forces"],
  "Service - Online registration - School Admission": ["Online registration - School Admission"],
  "Service - Passport Printing (4x6)": ["4 X 6 singles For Passport & pic.prntn", "old- stop- Passport records (old)"],
  "Service - Photocopy (A4 shet)": ["Photocopy"],
  "Service - Picture Printing (5x7)": ["old- stop- 5 X 7 Singles For Pictures - old (to be deleted)", "service- picture printing 5 x 7"],
  "Service - Placement": ["Placement"],
  "Service - Printing (A4)": ["Printing"],
  "Service - Receipt book printing": ["receipt book printing"],
  "Service - Typing (A4)": ["Typing"],
  "Service - White DL Envelope printing": ["White DL Envelope printing"],
  "Service - White envelope DL singles for sale": ["old stop - White Envelope (DL) Singles"],
  "TOSHIBA 15V CHARGER": ["TOSHIBA 15V"],
  "XBOX 360 GAMEPAD": ["XBOX 360"],
}

const DRY_RUN = process.argv.includes('--dry-run')

console.log(DRY_RUN ? '=== DRY RUN (no writes) ===' : '=== LIVE RUN ===')

let totalSalesUpdated = 0
let totalBillsUpdated = 0
let totalCountsUpdated = 0
let notFoundCanonical = []

for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
  const itemRows = await sql`
    SELECT id FROM items WHERE LOWER(TRIM(canonical_name)) = LOWER(TRIM(${canonical}))
  `
  if (itemRows.length === 0) {
    notFoundCanonical.push(canonical)
    continue
  }
  const itemId = itemRows[0].id

  for (const alias of aliases) {
    if (DRY_RUN) {
      const previewSales = await sql`
        SELECT COUNT(*) FROM sales_receipt_lines
        WHERE LOWER(TRIM(raw_item_name)) = LOWER(TRIM(${alias}))
          AND (resolved_name IS DISTINCT FROM ${canonical} OR item_id IS DISTINCT FROM ${itemId})
      `
      const previewBills = await sql`
        SELECT COUNT(*) FROM bill_lines
        WHERE LOWER(TRIM(raw_item_name)) = LOWER(TRIM(${alias}))
          AND (resolved_name IS DISTINCT FROM ${canonical} OR item_id IS DISTINCT FROM ${itemId})
      `
      const previewCounts = await sql`
        SELECT COUNT(*) FROM stock_counts
        WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(${alias}))
          AND (item_id IS DISTINCT FROM ${itemId} OR item_name IS DISTINCT FROM ${canonical})
      `
      const s = Number(previewSales[0].count), b = Number(previewBills[0].count), c = Number(previewCounts[0].count)
      if (s || b || c) {
        console.log(`"${alias}" -> "${canonical}": sales=${s} bills=${b} counts=${c}`)
      }
      totalSalesUpdated += s; totalBillsUpdated += b; totalCountsUpdated += c
    } else {
      const r1 = await sql`
        UPDATE sales_receipt_lines
        SET resolved_name = ${canonical}, item_id = ${itemId}
        WHERE LOWER(TRIM(raw_item_name)) = LOWER(TRIM(${alias}))
        RETURNING id
      `
      const r2 = await sql`
        UPDATE bill_lines
        SET resolved_name = ${canonical}, item_id = ${itemId}
        WHERE LOWER(TRIM(raw_item_name)) = LOWER(TRIM(${alias}))
        RETURNING id
      `
      const r3 = await sql`
        UPDATE stock_counts
        SET item_id = ${itemId}, item_name = ${canonical}
        WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(${alias}))
        RETURNING id
      `
      if (r1.length || r2.length || r3.length) {
        console.log(`"${alias}" -> "${canonical}": sales=${r1.length} bills=${r2.length} counts=${r3.length}`)
      }
      totalSalesUpdated += r1.length
      totalBillsUpdated += r2.length
      totalCountsUpdated += r3.length
    }
  }
}

console.log('\n=== SUMMARY ===')
console.log(`Sales lines ${DRY_RUN ? 'would be ' : ''}updated: ${totalSalesUpdated}`)
console.log(`Bill lines ${DRY_RUN ? 'would be ' : ''}updated: ${totalBillsUpdated}`)
console.log(`Stock count rows ${DRY_RUN ? 'would be ' : ''}updated: ${totalCountsUpdated}`)
if (notFoundCanonical.length) {
  console.log(`\nWARNING: canonical names not found in items table (skipped):`)
  notFoundCanonical.forEach(c => console.log(`  - ${c}`))
}
