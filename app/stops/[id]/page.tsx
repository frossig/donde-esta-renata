import { notFound, redirect } from 'next/navigation'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import StopGallery, { type StopData, type PhotoData } from './StopGallery'

export default async function StopPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Auth check
  const role = await getRoleFromCookies()
  if (!role) redirect('/login')

  const { id } = await params
  const db = await getDb()

  // Fetch the stop
  const stopResult = await db.execute({
    sql: `SELECT id, name, country, flag, date_start, date_end, postcard_text, cover_photo_id
          FROM stops
          WHERE id = ?`,
    args: [id],
  })

  if (stopResult.rows.length === 0) {
    notFound()
  }

  const row = stopResult.rows[0]
  const stop: StopData = {
    id:             row.id             as string,
    name:           row.name           as string,
    country:        row.country        as string,
    flag:           row.flag           as string,
    date_start:     row.date_start     as string,
    date_end:       row.date_end       as string,
    postcard_text:  row.postcard_text  as string | null,
    cover_photo_id: row.cover_photo_id as string | null,
  }

  // Fetch all photos for this stop ordered by taken_at ASC (nulls last)
  const photosResult = await db.execute({
    sql: `SELECT id, stop_id, r2_key, thumbnail_key, taken_at, lat, lng,
                 media_type, uploaded_at, assignment
          FROM photos
          WHERE stop_id = ?
          ORDER BY CASE WHEN taken_at IS NULL THEN 1 ELSE 0 END ASC,
                   taken_at ASC`,
    args: [id],
  })

  const photos: PhotoData[] = photosResult.rows.map((r) => ({
    id:            r.id            as string,
    stop_id:       r.stop_id       as string,
    r2_key:        r.r2_key        as string,
    thumbnail_key: r.thumbnail_key as string | null,
    taken_at:      r.taken_at      as string | null,
    lat:           r.lat           as number | null,
    lng:           r.lng           as number | null,
    media_type:    r.media_type    as string,
    uploaded_at:   r.uploaded_at   as string,
    assignment:    r.assignment    as string | null,
  }))

  // Fetch total reaction count across all photos of this stop
  const reactionsResult = await db.execute({
    sql: `SELECT COUNT(*) as total
          FROM reactions
          WHERE photo_id IN (
            SELECT id FROM photos WHERE stop_id = ?
          )`,
    args: [id],
  })

  const totalReactions = Number(reactionsResult.rows[0]?.total ?? 0)

  return (
    <StopGallery
      stop={stop}
      photos={photos}
      totalReactions={totalReactions}
    />
  )
}
