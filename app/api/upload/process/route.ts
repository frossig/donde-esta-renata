import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { getR2, getBucketName } from '@/lib/r2'

// ─── Haversine distance ───────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Fetch file from R2 as ArrayBuffer ────────────────────────────────────────

async function fetchFromR2(key: string): Promise<ArrayBuffer> {
  const r2 = getR2()
  const bucket = getBucketName()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const url = await getSignedUrl(r2, command, { expiresIn: 900 })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${key} from R2: ${res.status}`)
  return res.arrayBuffer()
}

// ─── Stop row type ────────────────────────────────────────────────────────────

interface StopRow {
  id: string
  lat: number
  lng: number
  radius_km: number
  date_start: string
  date_end: string
}

// ─── Auto-detect stop ─────────────────────────────────────────────────────────

function detectStop(
  stops: StopRow[],
  takenAt: Date | null,
  lat: number | null,
  lng: number | null,
): { stopId: string | null; assignment: string } {
  if (stops.length === 0) return { stopId: null, assignment: 'unassigned' }

  // 1. Date matching
  if (takenAt) {
    const dateStr = takenAt.toISOString().slice(0, 10)
    const dateMatches = stops.filter(
      (s) => dateStr >= s.date_start && dateStr <= s.date_end,
    )

    if (dateMatches.length === 1) {
      return { stopId: dateMatches[0].id, assignment: 'auto' }
    }

    if (dateMatches.length > 1 && lat !== null && lng !== null) {
      // Tiebreak by nearest GPS
      let nearest = dateMatches[0]
      let nearestDist = haversineKm(lat, lng, nearest.lat, nearest.lng)
      for (const s of dateMatches.slice(1)) {
        const d = haversineKm(lat, lng, s.lat, s.lng)
        if (d < nearestDist) {
          nearest = s
          nearestDist = d
        }
      }
      return { stopId: nearest.id, assignment: 'auto' }
    }

    if (dateMatches.length > 1) {
      // Multiple date matches but no GPS — pick first by display order
      return { stopId: dateMatches[0].id, assignment: 'auto' }
    }
  }

  // 2. GPS fallback — find nearest stop within radius_km
  if (lat !== null && lng !== null) {
    let nearest: StopRow | null = null
    let nearestDist = Infinity
    for (const s of stops) {
      const d = haversineKm(lat, lng, s.lat, s.lng)
      if (d <= s.radius_km && d < nearestDist) {
        nearest = s
        nearestDist = d
      }
    }
    if (nearest) {
      return { stopId: nearest.id, assignment: 'auto' }
    }
  }

  return { stopId: null, assignment: 'unassigned' }
}

// ─── POST /api/upload/process ─────────────────────────────────────────────────
// Body: { files: Array<{ key: string, stopId: string | 'auto' }> }

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

  const db = await getDb()
  const r2 = getR2()
  const bucket = getBucketName()

  // Pre-fetch all stops once for auto-detection
  const stopsResult = await db.execute(
    `SELECT id, lat, lng, radius_km, date_start, date_end FROM stops ORDER BY display_order ASC`,
  )
  const allStops: StopRow[] = stopsResult.rows.map((r) => ({
    id:         r.id         as string,
    lat:        r.lat        as number,
    lng:        r.lng        as number,
    radius_km:  r.radius_km  as number,
    date_start: r.date_start as string,
    date_end:   r.date_end   as string,
  }))

  const results = []

  for (const item of files as Array<{ key: string; stopId: string }>) {
    const { key, stopId: requestedStopId } = item

    // Infer media type from key extension
    const lowerKey = key.toLowerCase()
    const isVideo =
      lowerKey.endsWith('.mp4') ||
      lowerKey.endsWith('.mov') ||
      lowerKey.endsWith('.avi') ||
      lowerKey.endsWith('.webm') ||
      lowerKey.endsWith('.mkv')
    const mediaType = isVideo ? 'video' : 'photo'

    // Download file to read EXIF
    const fileBuffer = await fetchFromR2(key)

    // Parse EXIF (photos only; exifr handles graceful failure on videos/no-EXIF)
    let takenAt: Date | null = null
    let lat: number | null = null
    let lng: number | null = null

    if (!isVideo) {
      try {
        // exifr uses dynamic import pattern; import it here
        const exifr = (await import('exifr')).default
        const exif = await exifr.parse(fileBuffer, {
          pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude'],
          translateValues: true,
        })
        if (exif) {
          const dt = exif.DateTimeOriginal ?? exif.CreateDate
          if (dt instanceof Date) takenAt = dt
          const latVal = exif.latitude ?? (exif.GPSLatitude as number | undefined)
          const lngVal = exif.longitude ?? (exif.GPSLongitude as number | undefined)
          if (typeof latVal === 'number') lat = latVal
          if (typeof lngVal === 'number') lng = lngVal
        }
      } catch {
        // No EXIF — continue with nulls
      }
    }

    // Stop assignment
    let stopId: string | null
    let assignment: string

    if (requestedStopId !== 'auto') {
      stopId = requestedStopId
      assignment = 'manual'
    } else {
      const detected = detectStop(allStops, takenAt, lat, lng)
      stopId = detected.stopId
      assignment = detected.assignment
    }

    // Thumbnail generation for photos
    let thumbnailKey: string | null = null
    if (mediaType === 'photo') {
      try {
        const thumb = await sharp(Buffer.from(fileBuffer))
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()

        thumbnailKey = `${key}-thumb.jpg`
        await r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: thumbnailKey,
            Body: thumb,
            ContentType: 'image/jpeg',
          }),
        )
      } catch {
        // Thumbnail failure is non-fatal
        thumbnailKey = null
      }
    }

    // Insert into DB
    const photoId = crypto.randomUUID()
    const uploadedAt = new Date().toISOString()

    await db.execute({
      sql: `INSERT INTO photos (id, stop_id, r2_key, thumbnail_key, taken_at, lat, lng, media_type, uploaded_at, assignment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        photoId,
        stopId,
        key,
        thumbnailKey,
        takenAt ? takenAt.toISOString() : null,
        lat,
        lng,
        mediaType,
        uploadedAt,
        assignment,
      ],
    })

    results.push({ key, stopId, assignment, photoId })
  }

  return Response.json({ results })
}
