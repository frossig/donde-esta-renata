import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'

// POST /api/admin/stops/[id]/cover
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

  const { photoId } = body as { photoId?: unknown }

  if (!photoId || typeof photoId !== 'string') {
    return Response.json({ error: 'photoId is required' }, { status: 400 })
  }

  const db = await getDb()

  // Validate photo belongs to this stop
  const photoResult = await db.execute({
    sql: `SELECT id FROM photos WHERE id = ? AND stop_id = ?`,
    args: [photoId, id],
  })

  if (photoResult.rows.length === 0) {
    return Response.json(
      { error: 'Photo not found or does not belong to this stop' },
      { status: 404 },
    )
  }

  await db.execute({
    sql: `UPDATE stops SET cover_photo_id = ? WHERE id = ?`,
    args: [photoId, id],
  })

  return Response.json({ success: true })
}
