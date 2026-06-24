import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'
const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

const tables = ['sales_receipts', 'bills', 'expenses', 'staff_times', 'staff_absences']
for (const t of tables) {
  await sql.unsafe(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS entered_by TEXT`)
  console.log(`✓ ${t}`)
}
console.log('Done.')
