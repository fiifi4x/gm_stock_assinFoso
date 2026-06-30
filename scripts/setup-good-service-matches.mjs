import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

await sql`
  CREATE TABLE IF NOT EXISTS good_service_matches (
    id SERIAL PRIMARY KEY,
    good_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    sheets_per_pack NUMERIC,
    service_rate TEXT,
    notes TEXT,
    UNIQUE(good_name, service_name)
  )
`
console.log('✓ good_service_matches table')

// Curated from Grony_Item_Service_Matching.xlsx, sheet "1-PACK SERVICE MATCHING",
// CORRECT SR ENTRY? = "YES -- use this" rows only. Maps each Good (pack inventory
// item) to the Service(s) it produces when GMC-taken for internal use.
const PAIRS = [
  ['A4 SHEETS DOUBLE A', 'Service - Photocopy (A4 shet)', 500, '0.80'],
  ['A4 SHEETS DOUBLE A', 'Service - Printing (A4)', null, '1.00'],
  ['A4 SHEETS DOUBLE A', 'Service - Typing (A4)', null, '10.00'],
  ['A4 SHEETS DOUBLE A', 'Service - Scanning', null, '2.00'],
  ['A4 SHEETS DOUBLE A', 'A4 sheet singles for shop use (photocopies & print)', null, 'varies'],
  ['A4 SHEETS MAMBO', 'Service - Photocopy (A4 shet)', 500, '0.80'],
  ['A4 SHEETS MAMBO', 'Service - Printing (A4)', null, '1.00'],
  ['A4 SHEETS MAMBO', 'Service - Typing (A4)', null, '10.00'],
  ['A4 SHEETS MAMBO', 'A4 sheet singles for shop use (photocopies & print)', null, 'varies'],
  ['A4 SHEETS BESTPRINT', 'Service - Photocopy (A4 shet)', 500, '0.80'],
  ['A4 SHEETS BESTPRINT', 'Service - Printing (A4)', null, '1.00'],
  ['A4 SHEETS BESTPRINT', 'Service - Typing (A4)', null, '10.00'],
  ['A4 SHEETS BESTPRINT', 'A4 sheet singles for shop use (photocopies & print)', null, 'varies'],
  ['4 X 6 photopaper packs', 'Service - Passport Printing (4x6)', 50, '20.00'],
  ['4 X 6 photopaper packs', 'Service - Picture printing (4 x 6)', null, '5.00'],
  ['4 X 6 photopaper packs', 'Service - Passport Printing with 4x6 (New - use this on SR)', null, '20.00'],
  ['5 X 7 packs', 'service- picture printing 5 x 7 singles', 25, '7.00'],
  ['A4 Brown Envelope', 'Service - A4 Brown Envelope singles for sale', 50, '2.00'],
  ['A3 BROWN ENVELOPE pack', 'A3 Brown Envelope Singles', 50, 'varies'],
  ['A4 LAMINATION pack', 'Service - A4 Lamination', 100, '1.80'],
  ['A3 LAMINATION pack', 'Service - A3 Lamination', 100, 'varies'],
  ['White Envelope (DL)', 'Service - White envelope DL singles for sale', 50, '0.50'],
  ['Quarto Envelope', 'Quarto Envelope Singles', 50, '1.00'],
  ['Quarto Envelope', 'Service - Quarto Envelope singles for sale', null, '1.00'],
  ['Large Format 3ft banner', 'service-3ft banner', null, 'varies'],
]

let inserted = 0
for (const [good, service, sheets, rate] of PAIRS) {
  await sql`
    INSERT INTO good_service_matches (good_name, service_name, sheets_per_pack, service_rate)
    VALUES (${good}, ${service}, ${sheets}, ${rate})
    ON CONFLICT (good_name, service_name) DO NOTHING
  `
  inserted++
}
console.log(`✓ seeded ${inserted} good-service pairs`)
console.log('Done.')
