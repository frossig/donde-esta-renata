import { redirect } from 'next/navigation'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import MapView, { type Stop, type TripStatus } from '@/app/components/MapView'

// Never cache — page content depends on session cookie
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const role = await getRoleFromCookies()
  if (!role) redirect('/login')

  const db = await getDb()

  // Fetch stops
  const stopsResult = await db.execute(
    `SELECT id, name, country, flag, display_order, is_current,
            postcard_text, date_start, date_end
     FROM stops
     ORDER BY display_order ASC`
  )

  const stops: Stop[] = stopsResult.rows.map((row) => ({
    id:            row.id            as string,
    name:          row.name          as string,
    country:       row.country       as string,
    flag:          row.flag          as string,
    display_order: row.display_order as number,
    is_current:    row.is_current    as number,
    postcard_text: row.postcard_text as string | null,
    date_start:    row.date_start    as string,
    date_end:      row.date_end      as string,
  }))

  // Fetch photo counts per stop
  const photoCountsResult = await db.execute(
    `SELECT stop_id, COUNT(*) as count FROM photos GROUP BY stop_id`
  )

  const photoCounts: Record<string, number> = {}
  for (const row of photoCountsResult.rows) {
    photoCounts[row.stop_id as string] = Number(row.count ?? 0)
  }

  // Fetch up to 4 most-recent thumbnail keys per stop
  const thumbnailsResult = await db.execute(
    `SELECT id, stop_id, r2_key, thumbnail_key
     FROM (
       SELECT id, stop_id, r2_key, thumbnail_key, taken_at, uploaded_at,
              ROW_NUMBER() OVER (PARTITION BY stop_id ORDER BY taken_at DESC, uploaded_at DESC) AS rn
       FROM photos
       WHERE stop_id IS NOT NULL
     )
     WHERE rn <= 4`
  )

  const photosByStop: Record<string, { id: string; imgKey: string }[]> = {}
  for (const row of thumbnailsResult.rows) {
    const stopId = row.stop_id as string
    const imgKey = (row.thumbnail_key as string | null) ?? (row.r2_key as string)
    if (!photosByStop[stopId]) photosByStop[stopId] = []
    photosByStop[stopId].push({ id: row.id as string, imgKey })
  }

  // Fetch trip_status (single row)
  const statusResult = await db.execute(`SELECT state, current_stop_id, from_stop_id, to_stop_id, transport_mode, updated_at FROM trip_status WHERE id = 1`)

  let tripStatus: TripStatus | null = null
  if (statusResult.rows.length > 0) {
    const row = statusResult.rows[0]
    tripStatus = {
      state:           row.state           as 'at_stop' | 'in_transit',
      current_stop_id: row.current_stop_id as string | null,
      from_stop_id:    row.from_stop_id    as string | null,
      to_stop_id:      row.to_stop_id      as string | null,
      transport_mode:  row.transport_mode  as 'plane' | 'train' | 'bus' | null,
    }
  }

  // ── Auto-compute current stop from today's date ────────────────────────────
  // If Renata hasn't manually set her location (no is_current in DB), derive it
  // from the itinerary dates. She can always override via the Admin panel.
  const hasManualCurrent = stops.some((s) => s.is_current === 1)
  const manualInTransit  = tripStatus?.state === 'in_transit'

  let computedStops = stops
  let computedTripStatus = tripStatus

  if (!hasManualCurrent && !manualInTransit) {
    // Use UTC date string 'YYYY-MM-DD' to avoid timezone edge-cases
    const today = new Date().toISOString().slice(0, 10)
    const sorted = [...stops].sort((a, b) => a.display_order - b.display_order)

    // Find the stop whose date range covers today
    const currentStop = sorted.find(
      (s) => today >= s.date_start && today <= s.date_end
    )

    if (currentStop) {
      // Mark it as current in the in-memory array (no DB write)
      computedStops = stops.map((s) => ({
        ...s,
        is_current: s.id === currentStop.id ? 1 : 0,
      }))
      computedTripStatus = {
        state: 'at_stop',
        current_stop_id: currentStop.id,
        from_stop_id: null,
        to_stop_id: null,
        transport_mode: null,
      }
    } else {
      // Today is between stops (travel day) — find the surrounding segment
      const prevStop = [...sorted].reverse().find((s) => today > s.date_end)
      const nextStop = sorted.find((s) => today < s.date_start)
      if (prevStop && nextStop) {
        computedTripStatus = {
          state: 'in_transit',
          current_stop_id: null,
          from_stop_id: prevStop.id,
          to_stop_id: nextStop.id,
          transport_mode: null,
        }
      }
    }
  }

  return (
    <MapView
      stops={computedStops}
      tripStatus={computedTripStatus}
      photoCounts={photoCounts}
      photosByStop={photosByStop}
    />
  )
}
