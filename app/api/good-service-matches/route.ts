import { auth } from '@/lib/auth'
import sql from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json([], { status: 401 })

  try {
    const rows = await sql`
      SELECT good_name, service_name FROM good_service_matches ORDER BY good_name, service_name
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error('good-service-matches GET error:', e)
    return NextResponse.json([])
  }
}
