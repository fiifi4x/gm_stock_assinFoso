import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)
const rows = await sql`SELECT DISTINCT product_type, COUNT(*) AS cnt FROM items GROUP BY product_type ORDER BY cnt DESC`
console.log(JSON.stringify(rows))
