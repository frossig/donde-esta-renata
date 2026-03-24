import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'

// POST /api/admin/photos/[id]/assign
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

  const { stopId } = body as { stopId?: unknown }

  if (!stopId || typeof stopId !== 'string') {
    return Response.json({ error: 'stopId is required' }, { status: 400 })
  }

  const db = await getDb()

  // Validate stop exists
  const stopResult = await db.execute({
    sql: `SELECT id FROM stops WHERE id = ?`,
    args: [stopId],
  })

  if (stopResult.rows.length === 0) {
    return Response.json({ error: 'Stop not found' }, { status: 404 })
  }

  // Update photo
  const result = await db.execute({
    sql: `UPDATE photos SET stop_id = ?, assignment = 'manual' WHERE id = ?`,
    args: [stopId, id],
  })

  if (result.rowsAffected === 0) {
    return Response.json({ error: 'Photo not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
