import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

// POST { alias_name, item_id, alias_type? }
// Inserts into item_aliases and backfills sales_receipt_lines
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { alias_name, item_id, alias_type = 'manual' } = await req.json()
  if (!alias_name || !item_id) return NextResponse.json({ error: 'alias_name and item_id required' }, { status: 400 })

  // Upsert into item_aliases (unique on item_id + alias_name + alias_type)
  await sql`
    INSERT INTO item_aliases (item_id, alias_name, alias_type, source)
    VALUES (${item_id}, ${alias_name}, ${alias_type}, 'manual')
    ON CONFLICT (item_id, alias_name, alias_type) DO NOTHING
  `

  // Get canonical name
  const [item] = await sql`SELECT canonical_name FROM items WHERE id = ${item_id}`

  // Backfill sales_receipt_lines
  const updated = await sql`
    UPDATE sales_receipt_lines
    SET item_id = ${item_id}, resolved_name = ${item.canonical_name}, unresolved = false
    WHERE LOWER(TRIM(raw_item_name)) = LOWER(TRIM(${alias_name}))
    RETURNING id
  `

  return NextResponse.json({ inserted: 1, sales_updated: updated.length })
}
