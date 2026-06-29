import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'expenses' ORDER BY ordinal_position`
console.log(cols.map(c => `${c.column_name} (${c.data_type})`).join('\n'))
