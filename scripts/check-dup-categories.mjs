import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'
const env = readFileSync('.env.local', 'utf8')
const url = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=').slice(1).join('=').trim().replace(/^"|"$/g, '')
const sql = neon(url)

const items = await sql`SELECT canonical_name FROM items WHERE LOWER(status)='active' ORDER BY canonical_name`
const names = items.map(i => i.canonical_name)

// Photo paper candidates
console.log('=== PHOTO PAPER / GRAM items ===')
names.filter(n => /photo|glossy|matte|\d{3}\s*g/i.test(n) || (/\b(a3|a4)\b/i.test(n) && /\d{2,3}\s*g/i.test(n))).forEach(n => console.log(' ', n))

// Toner candidates
console.log('\n=== TONER / CARTRIDGE items ===')
names.filter(n => /toner|cartridge/i.test(n)).forEach(n => console.log(' ', n))

// Ink candidates
console.log('\n=== INK items ===')
names.filter(n => /\bink\b/i.test(n) && !/toner/i.test(n)).forEach(n => console.log(' ', n))
