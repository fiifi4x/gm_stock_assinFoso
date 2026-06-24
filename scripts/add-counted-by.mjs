import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

await sql`ALTER TABLE stock_counts ADD COLUMN IF NOT EXISTS counted_by TEXT`
console.log('Done: counted_by column added')
