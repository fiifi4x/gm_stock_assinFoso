import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

// Read XLSX
const { createRequire } = await import('module')
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const wb = XLSX.readFile('../(pre-zoho) BizIMS.xlsx')
const ws = wb.Sheets['Payslips']
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

// Excel serial date → YYYY-MM-DD
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000))
  return d.toISOString().slice(0, 10)
}

// Each "row-group" starts at a certain row and has up to 3 column-blocks.
// Layout within a row-group:
//   row+0: month header  (col+0='Month;' or '.', col+1=date serial)
//   row+1: column headers
//   row+3: Joe
//   row+4: Bino
//   row+5: James
//   row+6: Rawlings
//   row+11: payment period text (col+1 = period string)
// Column blocks at col offsets: [0, 17, 32] within each row-group

const STAFF_ROWS = [3, 4, 5, 6]  // relative row indices within a group
const COL_BLOCKS = [0, 17, 32]   // column offsets for each block within a group
const ROW_GROUPS = [0, 16, 32]   // row offsets for each group in the sheet

// Within a block, relative column positions:
const C = {
  name: 0, hours: 1, payHours: 2,
  otHours: 3, payOT: 4,
  longevityStart: 5, longevityDays: 6, payLongevity: 7,
  dutyDesc: 8, payDuty: 9,
  dataAllowance: 10, payHoursWorked: 11,
  ssnit: 12, total: 13,
}

function getCell(rowGroup, rowOffset, colBlock, colOffset) {
  const r = rowGroup + rowOffset
  const c = colBlock + colOffset
  return raw[r]?.[c] ?? null
}

function num(v) {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return isNaN(n) ? null : n
}

// Create table
await sql`
  CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    staff_name TEXT NOT NULL,
    pay_month DATE,
    payment_period TEXT,
    hours_worked NUMERIC,
    pay_for_hours NUMERIC,
    overtime_hours NUMERIC,
    pay_for_overtime NUMERIC,
    longevity_days NUMERIC,
    pay_for_longevity NUMERIC,
    duty_allowance NUMERIC,
    data_allowance NUMERIC,
    ssnit NUMERIC,
    total_salary NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`

let inserted = 0
const records = []

for (const rowGroup of ROW_GROUPS) {
  for (const colBlock of COL_BLOCKS) {
    // Read month date
    const monthSerial = getCell(rowGroup, 0, colBlock, 1)
    const payMonth = excelDate(monthSerial)
    if (!payMonth) continue

    // Read payment period
    const period = getCell(rowGroup, 11, colBlock, 1)

    for (const rowOffset of STAFF_ROWS) {
      const name = getCell(rowGroup, rowOffset, colBlock, C.name)
      if (!name || typeof name !== 'string' || name === 'TOTALS') continue

      records.push({
        staff_name: name,
        pay_month: payMonth,
        payment_period: typeof period === 'string' ? period : null,
        hours_worked: num(getCell(rowGroup, rowOffset, colBlock, C.hours)),
        pay_for_hours: num(getCell(rowGroup, rowOffset, colBlock, C.payHours)),
        overtime_hours: num(getCell(rowGroup, rowOffset, colBlock, C.otHours)),
        pay_for_overtime: num(getCell(rowGroup, rowOffset, colBlock, C.payOT)),
        longevity_days: num(getCell(rowGroup, rowOffset, colBlock, C.longevityDays)),
        pay_for_longevity: num(getCell(rowGroup, rowOffset, colBlock, C.payLongevity)),
        duty_allowance: num(getCell(rowGroup, rowOffset, colBlock, C.payDuty)),
        data_allowance: num(getCell(rowGroup, rowOffset, colBlock, C.dataAllowance)),
        ssnit: num(getCell(rowGroup, rowOffset, colBlock, C.ssnit)),
        total_salary: num(getCell(rowGroup, rowOffset, colBlock, C.total)),
      })
    }
  }
}

// Deduplicate by staff_name + pay_month
const seen = new Set()
const unique = records.filter(r => {
  const key = `${r.staff_name}|${r.pay_month}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

console.log(`Parsed ${unique.length} payslip records:`)
unique.forEach(r => console.log(`  ${r.staff_name} | ${r.pay_month} | total=₵${r.total_salary}`))

for (const r of unique) {
  await sql`
    INSERT INTO payslips (staff_name, pay_month, payment_period, hours_worked, pay_for_hours,
      overtime_hours, pay_for_overtime, longevity_days, pay_for_longevity,
      duty_allowance, data_allowance, ssnit, total_salary)
    VALUES (${r.staff_name}, ${r.pay_month}, ${r.payment_period},
      ${r.hours_worked}, ${r.pay_for_hours}, ${r.overtime_hours}, ${r.pay_for_overtime},
      ${r.longevity_days}, ${r.pay_for_longevity}, ${r.duty_allowance},
      ${r.data_allowance}, ${r.ssnit}, ${r.total_salary})
    ON CONFLICT DO NOTHING
  `
  inserted++
}

console.log(`\nInserted ${inserted} records.`)
