import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getRoleFromCookies } from '@/lib/auth'
import { getR2, getBucketName } from '@/lib/r2'

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200)
}

// POST /api/upload/sign
// Body: { files: Array<{ name: string, type: string }> }
// Returns: { uploads: Array<{ key: string, url: string, originalName: string }> }
export async function POST(request: Request) {
  const role = await getRoleFromCookies()
  if (role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { files } = body as { files?: unknown }

  if (!Array.isArray(files) || files.length === 0) {
    return Response.json({ error: 'files must be a non-empty array' }, { status: 400 })
  }

  const prefix = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
  const r2 = getR2()
  const bucket = getBucketName()

  const uploads = await Promise.all(
    files.map(async (file: unknown) => {
      const { name, type } = file as { name: string; type: string }
      const uuid = crypto.randomUUID()
      const sanitized = sanitizeFilename(name)
      const key = `${prefix}/${uuid}-${sanitized}`

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: type,
      })

      const url = await getSignedUrl(r2, command, { expiresIn: 900 })

      return { key, url, originalName: name }
    }),
  )

  return Response.json({ uploads })
}
