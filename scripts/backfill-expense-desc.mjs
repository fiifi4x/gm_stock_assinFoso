import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

const result = await sql`
  UPDATE expenses
  SET description = cf_description
  WHERE (description IS NULL OR description = '')
    AND cf_description IS NOT NULL
    AND cf_description != ''
  RETURNING id
`
console.log(`Updated ${result.length} rows`)
