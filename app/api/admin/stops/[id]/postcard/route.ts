import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'

// POST /api/admin/stops/[id]/postcard
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = await getRoleFromCookies()
  if (role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text } = body as { text?: unknown }

  if (typeof text !== 'string') {
    return Response.json({ error: 'text must be a string' }, { status: 400 })
  }

  if (text.length > 300) {
    return Response.json(
      { error: 'text must be 300 characters or fewer' },
      { status: 400 },
    )
  }

  const db = await getDb()

  const result = await db.execute({
    sql: `UPDATE stops SET postcard_text = ? WHERE id = ?`,
    args: [text, id],
  })

  if (result.rowsAffected === 0) {
    return Response.json({ error: 'Stop not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
