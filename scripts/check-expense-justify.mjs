import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

// Check all columns that might hold justify data
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses' AND column_name ILIKE '%just%'`
console.log('Justify-related columns:', cols.map(c => c.column_name))

const stats = await sql`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE cf_justify IS NOT NULL AND cf_justify != '') AS cf_justify_has,
    COUNT(*) FILTER (WHERE cf_justify IS NULL OR cf_justify = '') AS cf_justify_empty
  FROM expenses
`
console.log('Stats:', JSON.stringify(stats[0]))

// Show sample rows where cf_justify has data
const samples = await sql`
  SELECT id, expense_date::date, expense_account, cf_justify, amount
  FROM expenses
  WHERE cf_justify IS NOT NULL AND cf_justify != ''
  ORDER BY expense_date DESC LIMIT 10
`
console.log('\nSample rows with cf_justify data:')
samples.forEach(r => console.log(`  ${r.expense_date} | ${r.expense_account} | ${r.cf_justify} | ${r.amount}`))
