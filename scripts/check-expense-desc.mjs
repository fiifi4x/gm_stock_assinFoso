import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

// Check the 30th March 2026 entry specifically
const march30 = await sql`SELECT id, expense_date, description, cf_description, cf_justify, expense_account, amount FROM expenses WHERE expense_date::date = '2026-03-30' ORDER BY id`
console.log('30 Mar 2026 entries:')
console.log(JSON.stringify(march30, null, 2))

// Check how many rows have description NULL vs cf_description populated
const stats = await sql`
  SELECT
    COUNT(*) FILTER (WHERE description IS NULL OR description = '') AS desc_empty,
    COUNT(*) FILTER (WHERE cf_description IS NOT NULL AND cf_description != '') AS cf_desc_has_data,
    COUNT(*) FILTER (WHERE description IS NULL AND cf_description IS NOT NULL AND cf_description != '') AS desc_empty_but_cf_has
  FROM expenses
`
console.log('\nStats:', JSON.stringify(stats[0]))
