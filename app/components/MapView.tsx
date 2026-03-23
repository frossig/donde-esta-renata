'use client'

import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stop {
  id: string
  name: string
  country: string
  flag: string
  display_order: number
  is_current: number // 0 | 1 (SQLite integer)
  postcard_text: string | null
  date_start: string
  date_end: string
}

export interface TripStatus {
  state: 'at_stop' | 'in_transit'
  current_stop_id: string | null
  from_stop_id: string | null
  to_stop_id: string | null
  transport_mode: 'plane' | 'train' | 'bus' | null
}

interface Props {
  stops: Stop[]
  tripStatus: TripStatus | null
  photoCounts: Record<string, number>
}

// ─── SVG coordinates for the simplified Europe map ────────────────────────────

const STOP_COORDS: Record<string, { x: number; y: number }> = {
  'madrid-1':  { x: 85,  y: 185 },
  'sevilla':   { x: 70,  y: 210 },
  'barcelona': { x: 130, y: 175 },
  'londres':   { x: 145, y: 95  },
  'amsterdam': { x: 200, y: 85  },
  'bruselas':  { x: 195, y: 105 },
  'madrid-2':  { x: 85,  y: 185 }, // same dot as madrid-1, not drawn separately
}

// Transport mode emoji
function transportIcon(mode: string | null): string {
  if (mode === 'plane') return '✈️'
  if (mode === 'train') return '🚂'
  if (mode === 'bus')   return '🚌'
  return '✈️'
}

// ─── Simplified Europe SVG land shapes ────────────────────────────────────────
// These are hand-crafted rough outlines that give a recognisable silhouette
// within a 500×300 viewBox.

const EUROPE_PATH = `
  M 30 60
  L 55 50 L 80 45 L 110 48 L 140 42 L 170 38 L 210 35 L 250 33
  L 290 38 L 320 45 L 340 55 L 355 70 L 360 90 L 350 110
  L 355 130 L 345 148 L 335 165 L 320 178 L 305 185
  L 290 200 L 275 215 L 270 230 L 260 240 L 250 235
  L 240 225 L 230 215 L 220 208 L 210 200 L 200 195
  L 185 192 L 172 188 L 160 192 L 148 198 L 138 202
  L 128 210 L 118 220 L 108 228 L 98 235 L 88 240
  L 75 238 L 65 228 L 55 218 L 48 205 L 42 190
  L 35 175 L 30 160 L 28 140 L 25 120 L 22 100
  L 25 80 L 28 70 Z
`

const IBERIA_PATH = `
  M 48 170
  L 42 185 L 40 198 L 45 212 L 55 222 L 68 228
  L 80 232 L 92 228 L 102 220 L 110 210 L 115 198
  L 118 185 L 115 172 L 108 162 L 98 155 L 85 152
  L 72 155 L 60 162 L 52 168 Z
`

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapView({ stops, tripStatus, photoCounts }: Props) {
  const router = useRouter()

  // Sort stops by display_order
  const sortedStops = [...stops].sort((a, b) => a.display_order - b.display_order)

  // Find the current stop index
  const currentIndex = sortedStops.findIndex((s) => s.is_current === 1)

  // Determine stop visual state
  function stopState(stop: Stop, idx: number): 'visited' | 'current' | 'pending' {
    if (stop.is_current === 1) return 'current'
    if (currentIndex >= 0 && idx < currentIndex) return 'visited'
    if (currentIndex < 0) return 'pending' // no current set yet → all pending
    return 'pending'
  }

  // Build route segments: pairs of consecutive stops
  // Note: madrid-2 shares coords with madrid-1 so the line just returns there.
  const routeSegments = sortedStops.slice(0, -1).map((from, i) => {
    const to = sortedStops[i + 1]
    const fromCoords = STOP_COORDS[from.id]
    const toCoords   = STOP_COORDS[to.id]
    const isVisited  = currentIndex >= 0 && i < currentIndex
    return { from, to, fromCoords, toCoords, isVisited }
  })

  // Transit state
  const inTransit = tripStatus?.state === 'in_transit'
  const fromStop  = inTransit ? sortedStops.find((s) => s.id === tripStatus?.from_stop_id) : null
  const toStop    = inTransit ? sortedStops.find((s) => s.id === tripStatus?.to_stop_id)   : null
  const fromCoords = fromStop ? STOP_COORDS[fromStop.id] : null
  const toCoords2  = toStop   ? STOP_COORDS[toStop.id]   : null
  const midX = fromCoords && toCoords2 ? (fromCoords.x + toCoords2.x) / 2 : null
  const midY = fromCoords && toCoords2 ? (fromCoords.y + toCoords2.y) / 2 : null

  // Deduplicate map markers — madrid-1 and madrid-2 share the same coordinates,
  // so only render one dot.
  const seenCoords = new Set<string>()
  const uniqueMarkers = sortedStops.filter((stop) => {
    const key = `${STOP_COORDS[stop.id]?.x},${STOP_COORDS[stop.id]?.y}`
    if (seenCoords.has(key)) return false
    seenCoords.add(key)
    return true
  })

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: '#faf6f1' }}
    >
      {/* ── Header ── */}
      <header className="px-5 pt-8 pb-4 text-center">
        <h1
          className="font-serif text-3xl font-bold tracking-tight"
          style={{ color: '#5a4636' }}
        >
          Donde está Renata
        </h1>
        <p
          className="mt-1 text-base italic"
          style={{ color: '#a07050' }}
        >
          su aventura por Europa ✈️
        </p>

        {/* Transit banner */}
        {inTransit && toStop && (
          <div
            className="mt-3 mx-auto max-w-xs rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: '#fde8cc', color: '#7a4020' }}
          >
            {transportIcon(tripStatus?.transport_mode ?? null)}{' '}
            Renata está viajando a {toStop.name}
          </div>
        )}
      </header>

      {/* ── Map ── */}
      <div className="flex-1 px-3 pb-2">
        <div
          className="w-full rounded-2xl overflow-hidden shadow-sm"
          style={{ backgroundColor: '#dce8f0', border: '1px solid #c8d8e4' }}
        >
          <svg
            viewBox="0 0 500 300"
            className="w-full"
            style={{ maxHeight: '56vw' }}
            aria-label="Mapa de Europa con la ruta del viaje"
          >
            {/* Ocean background */}
            <rect width="500" height="300" fill="#cddde8" />

            {/* Land */}
            <path d={EUROPE_PATH} fill="#e8dfc8" stroke="#c8b89a" strokeWidth="1" />
            <path d={IBERIA_PATH} fill="#e8dfc8" stroke="#c8b89a" strokeWidth="0.5" />

            {/* Route lines */}
            {routeSegments.map(({ from, fromCoords: fc, toCoords: tc, isVisited }, i) => {
              if (!fc || !tc) return null
              return (
                <line
                  key={`seg-${i}`}
                  x1={fc.x} y1={fc.y}
                  x2={tc.x} y2={tc.y}
                  stroke={isVisited ? '#c4956a' : '#b0a090'}
                  strokeWidth={isVisited ? 2 : 1.5}
                  strokeDasharray={isVisited ? undefined : '4 3'}
                  opacity={isVisited ? 1 : 0.5}
                />
              )
            })}

            {/* Transit icon */}
            {inTransit && midX !== null && midY !== null && (
              <text
                x={midX}
                y={midY - 4}
                textAnchor="middle"
                fontSize="14"
                className="select-none"
              >
                {transportIcon(tripStatus?.transport_mode ?? null)}
              </text>
            )}

            {/* Stop markers */}
            {uniqueMarkers.map((stop) => {
              const coords = STOP_COORDS[stop.id]
              if (!coords) return null
              // For display_order-based visual state we need the original sorted index
              const origIdx = sortedStops.findIndex((s) => s.id === stop.id)
              const state   = stopState(stop, origIdx)

              if (state === 'current') {
                return (
                  <g
                    key={stop.id}
                    onClick={() => router.push(`/stops/${stop.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulsing ring */}
                    <circle
                      cx={coords.x} cy={coords.y} r={10}
                      fill="#e07842"
                      opacity={0.25}
                    >
                      <animate
                        attributeName="r"
                        values="8;14;8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.35;0;0.35"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={coords.x} cy={coords.y} r={7}
                      fill="#e07842"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={coords.x} y={coords.y - 12}
                      textAnchor="middle"
                      fontSize="11"
                      className="select-none"
                    >
                      📍
                    </text>
                    <text
                      x={coords.x} y={coords.y + 17}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="600"
                      fill="#5a4636"
                    >
                      {stop.name}
                    </text>
                  </g>
                )
              }

              if (state === 'visited') {
                return (
                  <g
                    key={stop.id}
                    onClick={() => router.push(`/stops/${stop.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={coords.x} cy={coords.y} r={5}
                      fill="#c4956a"
                      stroke="#fff"
                      strokeWidth="1.2"
                    />
                    <text
                      x={coords.x} y={coords.y + 14}
                      textAnchor="middle"
                      fontSize="7"
                      fill="#7a5540"
                    >
                      {stop.name}
                    </text>
                  </g>
                )
              }

              // pending
              return (
                <g
                  key={stop.id}
                  onClick={() => router.push(`/stops/${stop.id}`)}
                  style={{ cursor: 'pointer' }}
                  opacity={0.4}
                >
                  <circle
                    cx={coords.x} cy={coords.y} r={4}
                    fill="#a09080"
                    stroke="#fff"
                    strokeWidth="1"
                  />
                  <text
                    x={coords.x} y={coords.y + 13}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#7a6858"
                  >
                    {stop.name}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* ── Stop strip ── */}
      <div className="pb-safe px-0 pb-6">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 py-3" style={{ minWidth: 'max-content' }}>
            {sortedStops.map((stop, idx) => {
              const state = stopState(stop, idx)
              const isCurrent = state === 'current'
              const isPending = state === 'pending'

              return (
                <button
                  key={stop.id}
                  onClick={() => router.push(`/stops/${stop.id}`)}
                  className="flex flex-col items-center rounded-xl px-4 py-3 text-left transition-transform active:scale-95"
                  style={{
                    backgroundColor: isCurrent ? '#fff8f2' : '#f5ede2',
                    border: isCurrent ? '2px solid #e07842' : '1.5px solid #ddd0c0',
                    minWidth: '80px',
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  <span className="text-2xl leading-none">{stop.flag}</span>
                  <span
                    className="mt-1.5 text-xs font-semibold text-center leading-tight"
                    style={{ color: isCurrent ? '#7a3010' : '#5a4636' }}
                  >
                    {stop.name}
                  </span>
                  <span
                    className="mt-1 text-xs"
                    style={{ color: '#a09080' }}
                  >
                    {photoCounts[stop.id] ?? 0} fotos
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
