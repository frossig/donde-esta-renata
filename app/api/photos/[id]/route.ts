import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getR2, getBucketName } from '@/lib/r2'

// DELETE /api/photos/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const role = await getRoleFromCookies()
  if (role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const db = await getDb()

  // Fetch photo
  const result = await db.execute({
    sql: `SELECT id, r2_key, thumbnail_key FROM photos WHERE id = ?`,
    args: [id],
  })

  if (result.rows.length === 0) {
    return Response.json({ error: 'Photo not found' }, { status: 404 })
  }

  const photo = result.rows[0]
  const r2Key = photo.r2_key as string
  const thumbnailKey = photo.thumbnail_key as string | null

  const r2 = getR2()
  const bucket = getBucketName()

  // Delete from R2
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }))
  if (thumbnailKey) {
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: thumbnailKey }))
  }

  // If this photo is the cover of a stop, clear cover_photo_id
  await db.execute({
    sql: `UPDATE stops SET cover_photo_id = NULL WHERE cover_photo_id = ?`,
    args: [id],
  })

  // Delete from DB
  await db.execute({
    sql: `DELETE FROM photos WHERE id = ?`,
    args: [id],
  })

  return Response.json({ success: true })
}
