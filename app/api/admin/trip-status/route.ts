import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'

// POST /api/admin/trip-status
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

  const data = body as {
    state?: unknown
    currentStopId?: unknown
    fromStopId?: unknown
    toStopId?: unknown
    transportMode?: unknown
  }

  const { state } = data

  if (state !== 'at_stop' && state !== 'in_transit') {
    return Response.json(
      { error: 'state must be "at_stop" or "in_transit"' },
      { status: 400 },
    )
  }

  const db = await getDb()
  const updatedAt = new Date().toISOString()

  if (state === 'at_stop') {
    const currentStopId = data.currentStopId
    if (!currentStopId || typeof currentStopId !== 'string') {
      return Response.json({ error: 'currentStopId is required' }, { status: 400 })
    }

    // Verify stop exists
    const stopCheck = await db.execute({
      sql: `SELECT id FROM stops WHERE id = ?`,
      args: [currentStopId],
    })
    if (stopCheck.rows.length === 0) {
      return Response.json({ error: 'Stop not found' }, { status: 404 })
    }

    // Transaction: update trip_status + set is_current on stops
    await db.batch([
      {
        sql: `INSERT INTO trip_status (id, state, current_stop_id, from_stop_id, to_stop_id, transport_mode, updated_at)
              VALUES (1, 'at_stop', ?, NULL, NULL, NULL, ?)
              ON CONFLICT(id) DO UPDATE SET
                state = 'at_stop',
                current_stop_id = excluded.current_stop_id,
                from_stop_id = NULL,
                to_stop_id = NULL,
                transport_mode = NULL,
                updated_at = excluded.updated_at`,
        args: [currentStopId, updatedAt],
      },
      {
        sql: `UPDATE stops SET is_current = 0`,
        args: [],
      },
      {
        sql: `UPDATE stops SET is_current = 1 WHERE id = ?`,
        args: [currentStopId],
      },
    ])
  } else {
    // in_transit
    const { fromStopId, toStopId, transportMode } = data

    if (!fromStopId || typeof fromStopId !== 'string') {
      return Response.json({ error: 'fromStopId is required' }, { status: 400 })
    }
    if (!toStopId || typeof toStopId !== 'string') {
      return Response.json({ error: 'toStopId is required' }, { status: 400 })
    }
    if (
      transportMode !== 'plane' &&
      transportMode !== 'train' &&
      transportMode !== 'bus'
    ) {
      return Response.json(
        { error: 'transportMode must be "plane", "train", or "bus"' },
        { status: 400 },
      )
    }

    // Validate stop IDs against DB
    const allStops = await db.execute({ sql: `SELECT id FROM stops`, args: [] })
    const stopIds = allStops.rows.map((s) => s.id as string)
    if (!stopIds.includes(fromStopId) || !stopIds.includes(toStopId)) {
      return Response.json({ error: 'Invalid stop ID' }, { status: 400 })
    }
    if (fromStopId === toStopId) {
      return Response.json({ error: 'from and to stops must be different' }, { status: 400 })
    }

    await db.batch([
      { sql: 'UPDATE stops SET is_current = 0' },
      {
        sql: `INSERT INTO trip_status (id, state, from_stop_id, to_stop_id, transport_mode, current_stop_id, updated_at)
              VALUES (1, 'in_transit', ?, ?, ?, NULL, ?)
              ON CONFLICT(id) DO UPDATE SET
                state = 'in_transit',
                from_stop_id = excluded.from_stop_id,
                to_stop_id = excluded.to_stop_id,
                transport_mode = excluded.transport_mode,
                current_stop_id = NULL,
                updated_at = excluded.updated_at`,
        args: [fromStopId, toStopId, transportMode, new Date().toISOString()]
      }
    ])
  }

  return Response.json({ success: true })
}
