import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getR2, getBucketName } from '@/lib/r2'

// GET /api/media/[key]
// key is URL-encoded with encodeURIComponent on the client
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const role = await getRoleFromCookies()
  if (!role) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { key: encodedKey } = await params
  const decodedKey = decodeURIComponent(encodedKey)

  const db = await getDb()
  const result = await db.execute({
    sql: 'SELECT id FROM photos WHERE r2_key = ? OR thumbnail_key = ?',
    args: [decodedKey, decodedKey]
  })
  if (result.rows.length === 0) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const r2 = getR2()
  const bucket = getBucketName()

  const command = new GetObjectCommand({ Bucket: bucket, Key: decodedKey })
  const url = await getSignedUrl(r2, command, { expiresIn: 3600 })

  return Response.redirect(url, 302)
}
