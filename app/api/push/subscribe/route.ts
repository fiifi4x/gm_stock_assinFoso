import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, keys } = await req.json()
  const username = (session.user as any)?.username || session.user?.name || 'unknown'

  await sql`
    INSERT INTO push_subscriptions (username, endpoint, p256dh, auth)
    VALUES (${username}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
    ON CONFLICT (endpoint) DO UPDATE SET username = ${username}, p256dh = ${keys.p256dh}, auth = ${keys.auth}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json()
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`
  return NextResponse.json({ ok: true })
}
