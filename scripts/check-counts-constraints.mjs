import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'
const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

const constraints = await sql`
  SELECT conname, contype, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'stock_counts'::regclass
`
console.log('Constraints:', JSON.stringify(constraints, null, 2))

const sample = await sql`SELECT id, item_name, count_date, counted_by FROM stock_counts ORDER BY id DESC LIMIT 10`
console.log('\nLast 10 counts:', JSON.stringify(sample, null, 2))
