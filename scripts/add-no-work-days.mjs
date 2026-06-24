import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

await sql`
  CREATE TABLE IF NOT EXISTS no_work_days (
    id          BIGSERIAL PRIMARY KEY,
    work_date   DATE NOT NULL UNIQUE,
    reason      TEXT NOT NULL,
    recorded_by TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`
console.log('Table created: no_work_days')
