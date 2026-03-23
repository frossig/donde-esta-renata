import { notFound, redirect } from 'next/navigation'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import PhotoViewer, { type PhotoData, type ReactionData } from './PhotoViewer'

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string; photoId: string }>
}) {
  // Auth check
  const role = await getRoleFromCookies()
  if (!role) redirect('/login')

  const { id, photoId } = await params
  const db = await getDb()

  // Fetch the stop
  const stopResult = await db.execute({
    sql: `SELECT id, name FROM stops WHERE id = ?`,
    args: [id],
  })

  if (stopResult.rows.length === 0) {
    notFound()
  }

  const stopRow = stopResult.rows[0]
  const stop = {
    id: stopRow.id as string,
    name: stopRow.name as string,
  }

  // Fetch all photos for the stop ordered by taken_at ASC (nulls last)
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

  // Verify the current photo exists in this stop
  const currentPhotoIndex = photos.findIndex((p) => p.id === photoId)
  if (currentPhotoIndex === -1) {
    notFound()
  }

  // Fetch reactions for current photo
  const reactionsResult = await db.execute({
    sql: `SELECT id, photo_id, emoji, comment, reactor, created_at
          FROM reactions
          WHERE photo_id = ?
          ORDER BY created_at ASC`,
    args: [photoId],
  })

  const reactions: ReactionData[] = reactionsResult.rows.map((r) => ({
    id:         r.id         as string,
    photo_id:   r.photo_id   as string,
    emoji:      r.emoji      as string | null,
    comment:    r.comment    as string | null,
    reactor:    r.reactor    as string,
    created_at: r.created_at as string,
  }))

  return (
    <PhotoViewer
      stop={stop}
      photos={photos}
      currentPhotoIndex={currentPhotoIndex}
      initialReactions={reactions}
    />
  )
}
