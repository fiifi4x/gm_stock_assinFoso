import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const sql = neon(env.DATABASE_URL)

await sql`
  CREATE TABLE IF NOT EXISTS violation_assignments (
    violation_type TEXT PRIMARY KEY,
    staff_name TEXT NOT NULL
  )
`
console.log('✓ violation_assignments')

await sql`
  CREATE TABLE IF NOT EXISTS violation_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`
console.log('✓ violation_settings')

await sql`
  CREATE TABLE IF NOT EXISTS auto_penalty_log (
    id SERIAL PRIMARY KEY,
    violation_type TEXT NOT NULL,
    instance_key TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(violation_type, instance_key)
  )
`
console.log('✓ auto_penalty_log')

await sql`ALTER TABLE staff_violations ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0`
console.log('✓ staff_violations.points')

// Seed default settings if not already present
await sql`
  INSERT INTO violation_settings (key, value) VALUES ('threshold_days', '3')
  ON CONFLICT (key) DO NOTHING
`
await sql`
  INSERT INTO violation_settings (key, value) VALUES ('points_per_violation', '5')
  ON CONFLICT (key) DO NOTHING
`
console.log('✓ default settings (threshold_days=3, points_per_violation=5)')

console.log('\nDone. Set a CRON_SECRET environment variable in Vercel, then deploy vercel.json for the daily auto-check to run.')
