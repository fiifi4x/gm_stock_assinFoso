import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'
const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

// All distinct statuses and counts
const statuses = await sql`SELECT status, COUNT(*)::int AS cnt FROM items GROUP BY status ORDER BY status`
console.log('=== STATUSES ===')
statuses.forEach(r => console.log(`  ${r.status}: ${r.cnt}`))

// Items flagged by duplicates query - check what statuses they have
const dups = await sql`
  SELECT a.canonical_name AS name1, a.status AS status1,
         b.canonical_name AS name2, b.status AS status2
  FROM items a
  JOIN items b ON a.id < b.id
    AND LOWER(TRIM(a.canonical_name)) = LOWER(TRIM(b.canonical_name))
  ORDER BY a.canonical_name
  LIMIT 30
`
console.log('\n=== EXACT DUPLICATE NAMES (all statuses) ===')
dups.forEach(r => console.log(`  "${r.name1}" [${r.status1}]  ↔  "${r.name2}" [${r.status2}]`))

// What statuses does the inventory page filter by?
const notInactive = await sql`SELECT COUNT(*)::int AS cnt FROM items WHERE status NOT IN ('inactive')`
console.log(`\nItems with status NOT inactive: ${notInactive[0].cnt}`)
