import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

await sql`
  CREATE TABLE IF NOT EXISTS staff_absences (
    id SERIAL PRIMARY KEY,
    staff_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    absence_type TEXT DEFAULT 'other',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS staff_rota (
    id SERIAL PRIMARY KEY,
    staff_name TEXT NOT NULL,
    rota_date DATE NOT NULL,
    sched_in TEXT,
    sched_out TEXT,
    is_off BOOLEAN DEFAULT FALSE,
    role TEXT,
    UNIQUE(staff_name, rota_date)
  )
`

console.log('Done: staff_absences and staff_rota tables created')
