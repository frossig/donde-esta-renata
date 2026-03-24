'use client'

import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Stop {
  id: string
  name: string
  country: string
  flag: string
  display_order: number
  is_current: number // 0 | 1
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
  photosByStop: Record<string, { id: string; imgKey: string }[]>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function transportEmoji(mode: string | null): string {
  if (mode === 'train') return '🚂'
  if (mode === 'bus') return '🚌'
  return '✈️'
}

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const s = new Date(start + 'T12:00:00').toLocaleDateString('es-ES', opts)
  const e = new Date(end + 'T12:00:00').toLocaleDateString('es-ES', opts)
  return `${s} – ${e}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapView({ stops, tripStatus, photoCounts, photosByStop }: Props) {
  const router = useRouter()

  const sortedStops = [...stops].sort((a, b) => a.display_order - b.display_order)
  const currentIndex = sortedStops.findIndex((s) => s.is_current === 1)

  function stopState(idx: number): 'visited' | 'current' | 'pending' {
    if (sortedStops[idx].is_current === 1) return 'current'
    if (currentIndex >= 0 && idx < currentIndex) return 'visited'
    return 'pending'
  }

  const inTransit = tripStatus?.state === 'in_transit'
  const transitTo = inTransit
    ? sortedStops.find((s) => s.id === tripStatus?.to_stop_id)
    : null

  // Line geometry constants
  const RAIL_W = 28   // px — total width of left rail column
  const DOT_SIZE = 10   // px — small dot
  const DOT_CURR = 18   // px — current stop dot
  const LINE_W = 2    // px
  const CARD_TOP_PAD = 18 // must match card's paddingTop

  // Dot center Y from row top — aligns with city name text
  // card paddingTop (18) + half of text line height (~13) = ~24
  const dotCenterY = CARD_TOP_PAD + 13

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#faf6f1' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-5 pt-8 pb-6 text-center">
        <h1 className="font-serif font-bold tracking-tight" style={{ fontSize: 32, lineHeight: 1.15, color: '#3d2b1f' }}>
          ¿Dónde está{' '}
          <span style={{ color: '#c4956a' }}>Renata</span>
          {' '}✈️?
        </h1>
        <p className="mt-1.5 italic" style={{ fontSize: 15, color: '#9a7456' }}>
          su aventura por Europa
        </p>

        {/* Transit banner */}
        {inTransit && transitTo && (
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2"
            style={{ backgroundColor: '#fde8cc', color: '#7a3a10', border: '1px solid #f5c896', fontSize: 14, fontWeight: 500 }}
          >
            <span>{transportEmoji(tripStatus?.transport_mode ?? null)}</span>
            <span>Renata está viajando a {transitTo.name}</span>
          </div>
        )}
      </header>

      {/* ── Timeline ───────────────────────────────────────────────────────── */}
      <div className="flex-1 pb-12" style={{ paddingLeft: 20, paddingRight: 16, maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {sortedStops.map((stop, idx) => {
          const state = stopState(idx)
          const isFirst = idx === 0
          const isLast = idx === sortedStops.length - 1
          const count = photoCounts[stop.id] ?? 0
          const dotSize = state === 'current' ? DOT_CURR : DOT_SIZE
          const dotLeft = RAIL_W / 2 - dotSize / 2  // center dot in rail

          // Line color
          const lineColor = (state === 'visited' || state === 'current') ? '#c4956a' : '#d8cfc6'

          // Is this the active transit segment?
          const isTransitSegment = inTransit && tripStatus?.from_stop_id === stop.id && !isLast

          return (
            <div
              key={stop.id}
              className="flex items-stretch"
              style={{ gap: 12 }}
            >
              {/* ── Rail ── */}
              <div style={{ position: 'relative', width: RAIL_W, flexShrink: 0 }}>

                {/* Line above dot (connects from previous row — skip on first) */}
                {!isFirst && (
                  <div style={{
                    position: 'absolute',
                    left: RAIL_W / 2 - LINE_W / 2,
                    top: 0,
                    height: dotCenterY - dotSize / 2,
                    width: LINE_W,
                    backgroundColor: lineColor,
                  }} />
                )}

                {/* Line below dot (connects to next row — skip on last) */}
                {!isLast && (
                  isTransitSegment ? (
                    // Transit segment: orange line + transport icon
                    <div style={{
                      position: 'absolute',
                      left: RAIL_W / 2 - LINE_W / 2,
                      top: dotCenterY + dotSize / 2,
                      bottom: 0,
                      width: LINE_W,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <div style={{ width: LINE_W, flex: 1, backgroundColor: '#e07842', opacity: 0.6 }} />
                      <span style={{ fontSize: 14, lineHeight: 1, margin: '4px 0', marginLeft: -6 }}>
                        {transportEmoji(tripStatus?.transport_mode ?? null)}
                      </span>
                      <div style={{ width: LINE_W, flex: 1, backgroundColor: '#e07842', opacity: 0.3 }} />
                    </div>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      left: RAIL_W / 2 - LINE_W / 2,
                      top: dotCenterY + dotSize / 2,
                      bottom: 0,
                      width: LINE_W,
                      backgroundColor: lineColor,
                    }} />
                  )
                )}

                {/* Dot */}
                <div style={{
                  position: 'absolute',
                  top: dotCenterY - dotSize / 2,
                  left: dotLeft,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  zIndex: 1,
                  backgroundColor:
                    state === 'current' ? '#e07842' :
                      state === 'visited' ? '#c4956a' : '#ccc4bb',
                  border: state === 'current'
                    ? `3px solid #faf6f1`
                    : `2px solid #faf6f1`,
                  boxShadow: state === 'current'
                    ? '0 0 0 3px rgba(224,120,66,0.3)'
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {state === 'visited' && (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      backgroundColor: '#fff',
                    }} />
                  )}
                </div>
              </div>

              {/* ── Card ── */}
              <div className="flex-1" style={{ paddingBottom: isLast ? 0 : 12 }}>
                <button
                  onClick={() => router.push(`/stops/${stop.id}`)}
                  className="w-full text-left rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    padding: `${CARD_TOP_PAD}px 18px 16px`,
                    backgroundColor: state === 'pending' ? 'transparent' : '#ffffff',
                    border:
                      state === 'current' ? '1.5px solid #e07842' :
                        state === 'visited' ? '1px solid #e8d8c4' : 'none',
                    boxShadow: state === 'current'
                      ? '0 0 0 3px rgba(224,120,66,0.08), 0 2px 8px rgba(0,0,0,0.06)'
                      : state === 'visited'
                        ? '0 1px 4px rgba(0,0,0,0.05)'
                        : 'none',
                    opacity: state === 'pending' ? 0.45 : 1,
                  }}
                >
                  {/* Header row: flag + name + date */}
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{stop.flag}</span>
                    <span
                      className="font-serif font-bold flex-1"
                      style={{
                        fontSize: state === 'current' ? 21 : 19,
                        lineHeight: 1.2,
                        color:
                          state === 'current' ? '#6b2a08' :
                            state === 'visited' ? '#3d2b1f' : '#7a6858',
                      }}
                    >
                      {stop.name}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color:
                          state === 'current' ? '#a04820' :
                            state === 'visited' ? '#8a6848' : '#a8998a',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {formatDateRange(stop.date_start, stop.date_end)}
                    </span>
                  </div>

                  {/* "Aquí ahora" badge */}
                  {state === 'current' && (
                    <div className="mt-2 inline-flex items-center gap-1" style={{ fontSize: 12 }}>
                      <span>📍</span>
                      <span style={{ color: '#c05010', fontWeight: 600 }}>Aquí ahora</span>
                    </div>
                  )}

                  {/* Photo count */}
                  {state !== 'pending' && (
                    <p className="mt-2" style={{ fontSize: 13, color: '#b8905a', fontWeight: 500 }}>
                      {count === 0 ? 'Sin fotos aún' : `${count} ${count === 1 ? 'foto' : 'fotos'}`}
                    </p>
                  )}

                  {/* Thumbnail strip */}
                  {state !== 'pending' && photosByStop[stop.id]?.length > 0 && (
                    <div className="mt-2 flex gap-1.5 overflow-hidden">
                      {photosByStop[stop.id].slice(0, 4).map((p) => (
                        <img
                          key={p.id}
                          src={`/api/media/${encodeURIComponent(p.imgKey)}`}
                          alt=""
                          loading="lazy"
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: 'cover',
                            borderRadius: 8,
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Postcard text */}
                  {stop.postcard_text && state !== 'pending' && (
                    <p className="mt-2 italic line-clamp-2" style={{ fontSize: 13, color: '#8a6040', lineHeight: 1.45 }}>
                      "{stop.postcard_text}"
                    </p>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
