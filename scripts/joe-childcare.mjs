/**
 * For Joe, June 2026 onwards:
 * - Restore full hourly pay structure from staff_times
 * - Add childcare_allowance = 2000 - (pay_for_hours + pay_for_longevity + duty + data)
 * - total_salary = 2000
 *
 * Run: node scripts/joe-childcare.mjs
 */
import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const envRaw = readFileSync('.env.local', 'utf8')
const url = envRaw.split('\n').find(l => l.trim().startsWith('postgres')).trim()
const sql = neon(url)

function parseTimeMins(t) {
  if (!t) return null
  const m = t.match(/^(\d+):(\d+)(am|pm)$/i)
  if (!m) return null
  let h = parseInt(m[1]), min = parseInt(m[2])
  if (m[3].toLowerCase() === 'pm' && h !== 12) h += 12
  if (m[3].toLowerCase() === 'am' && h === 12) h = 0
  return h * 60 + min
}

const HOURLY    = 5.50
const DUTY      = 50.00
const DATA      = 100.00
const LONG_DAYS = 1578
const LONG_RATE = 0.05
const TARGET    = 2000.00

console.log('\n══════════════════════════════════════════')
console.log('  JOE CHILDCARE TOP-UP — JUNE 2026')
console.log('══════════════════════════════════════════\n')

// 1. Add childcare_allowance column if not exists
await sql`ALTER TABLE payslips ADD COLUMN IF NOT EXISTS childcare_allowance NUMERIC`
console.log('✓ childcare_allowance column ready\n')

// 2. Process June 2026 (and any future flat months can use same logic)
const MONTHS = [
  { start: '2026-06-01', end: '2026-06-30', payMonth: '2026-06-30', period: '1st June, 2026 to 30th June, 2026' },
]

for (const { start, end, payMonth, period } of MONTHS) {
  const rows = await sql`
    SELECT actual_in, actual_out FROM staff_times
    WHERE staff_name = 'joe' AND work_date >= ${start} AND work_date <= ${end}
      AND actual_in IS NOT NULL AND actual_out IS NOT NULL
  `
  let totalMins = 0
  for (const r of rows) {
    const inM = parseTimeMins(r.actual_in), outM = parseTimeMins(r.actual_out)
    if (inM == null || outM == null) continue
    totalMins += outM >= inM ? outM - inM : (outM + 1440) - inM
  }

  const hours    = parseFloat((totalMins / 60).toFixed(4))
  const payHours = parseFloat((hours * HOURLY).toFixed(2))
  const payLong  = parseFloat((LONG_DAYS * LONG_RATE).toFixed(2))
  const components = payHours + payLong + DUTY + DATA
  const childcare  = parseFloat(Math.max(0, TARGET - components).toFixed(2))
  const total      = parseFloat((components + childcare).toFixed(2))

  await sql`
    UPDATE payslips SET
      hours_worked        = ${hours},
      pay_for_hours       = ${payHours},
      overtime_hours      = 0,
      pay_for_overtime    = 0,
      longevity_days      = ${LONG_DAYS},
      pay_for_longevity   = ${payLong},
      duty_allowance      = ${DUTY},
      data_allowance      = ${DATA},
      ssnit               = null,
      childcare_allowance = ${childcare},
      total_salary        = ${total},
      payment_period      = ${period}
    WHERE staff_name = 'Joe' AND pay_month = ${payMonth}
  `

  console.log(`  Month        : ${payMonth}`)
  console.log(`  Hours worked : ${hours.toFixed(2)}h`)
  console.log(`  Pay for hrs  : ₵${payHours}`)
  console.log(`  Longevity    : ${LONG_DAYS}d × ₵${LONG_RATE} = ₵${payLong}`)
  console.log(`  Duty         : ₵${DUTY}`)
  console.log(`  Data         : ₵${DATA}`)
  console.log(`  Childcare    : ₵${childcare}`)
  console.log(`  ─────────────────────────`)
  console.log(`  TOTAL        : ₵${total}\n`)
}

console.log('✅ Done!\n')
