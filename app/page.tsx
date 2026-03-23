import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'
import MapView, { type Stop, type TripStatus } from '@/app/components/MapView'

export default async function HomePage() {
  // Auth: read session cookie directly (server component — no request arg)
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (session !== 'family' && session !== 'admin') {
    redirect('/login')
  }

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

  // Fetch trip_status (single row)
  const statusResult = await db.execute(`SELECT * FROM trip_status WHERE id = 1`)

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

  return <MapView stops={stops} tripStatus={tripStatus} />
}
