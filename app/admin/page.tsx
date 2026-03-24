import { redirect } from 'next/navigation'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import AdminPanel from './AdminPanel'
import type { AdminStop, AdminTripStatus, AdminPhoto } from './AdminPanel'

export default async function AdminPage() {
  const role = await getRoleFromCookies()
  if (role !== 'admin') redirect('/')

  const db = await getDb()

  // Fetch all stops
  const stopsResult = await db.execute(
    `SELECT id, name, country, flag, display_order, is_current,
            postcard_text, cover_photo_id, date_start, date_end
     FROM stops
     ORDER BY display_order ASC`,
  )

  const stops: AdminStop[] = stopsResult.rows.map((row) => ({
    id:             row.id             as string,
    name:           row.name           as string,
    country:        row.country        as string,
    flag:           row.flag           as string,
    display_order:  row.display_order  as number,
    is_current:     row.is_current     as number,
    postcard_text:  row.postcard_text  as string | null,
    cover_photo_id: row.cover_photo_id as string | null,
    date_start:     row.date_start     as string,
    date_end:       row.date_end       as string,
  }))

  // Fetch trip_status singleton
  const statusResult = await db.execute(
    `SELECT state, current_stop_id, from_stop_id, to_stop_id, transport_mode, updated_at
     FROM trip_status WHERE id = 1`,
  )

  let tripStatus: AdminTripStatus | null = null
  if (statusResult.rows.length > 0) {
    const row = statusResult.rows[0]
    tripStatus = {
      state:           row.state           as 'at_stop' | 'in_transit',
      current_stop_id: row.current_stop_id as string | null,
      from_stop_id:    row.from_stop_id    as string | null,
      to_stop_id:      row.to_stop_id      as string | null,
      transport_mode:  row.transport_mode  as 'plane' | 'train' | 'bus' | null,
      updated_at:      row.updated_at      as string,
    }
  }

  // Fetch all photos (with stop assignment)
  const photosResult = await db.execute(
    `SELECT id, stop_id, r2_key, thumbnail_key, media_type, uploaded_at, assignment
     FROM photos
     ORDER BY uploaded_at DESC`,
  )

  const photos: AdminPhoto[] = photosResult.rows.map((row) => ({
    id:            row.id            as string,
    stop_id:       row.stop_id       as string | null,
    r2_key:        row.r2_key        as string,
    thumbnail_key: row.thumbnail_key as string | null,
    media_type:    row.media_type    as string,
    uploaded_at:   row.uploaded_at   as string,
    assignment:    row.assignment    as string | null,
  }))

  return (
    <AdminPanel stops={stops} tripStatus={tripStatus} photos={photos} />
  )
}
