'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { PhotoData } from '@/lib/types'

export type { PhotoData }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StopData {
  id: string
  name: string
  country: string
  flag: string
  date_start: string
  date_end: string
  postcard_text: string | null
  cover_photo_id: string | null
}

interface Props {
  stop: StopData
  photos: PhotoData[]
  totalReactions: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  // Dates are stored as ISO strings or 'YYYY-MM-DD'
  const parseDate = (s: string) => {
    // Handle both 'YYYY-MM-DD' and ISO datetime strings
    const d = new Date(s.includes('T') ? s : s + 'T00:00:00')
    return d
  }

  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]

  const d1 = parseDate(start)
  const d2 = parseDate(end)

  const day1 = d1.getUTCDate()
  const month1 = months[d1.getUTCMonth()]
  const day2 = d2.getUTCDate()
  const month2 = months[d2.getUTCMonth()]

  if (d1.getUTCMonth() === d2.getUTCMonth()) {
    return `${day1} – ${day2} ${month1}`
  }
  return `${day1} ${month1} – ${day2} ${month2}`
}

function mediaUrl(photo: PhotoData): string {
  const key = photo.thumbnail_key ?? photo.r2_key
  return `/api/media/${encodeURIComponent(key)}`
}

function heroUrl(photo: PhotoData): string {
  return `/api/media/${encodeURIComponent(photo.r2_key)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StopGallery({ stop, photos, totalReactions }: Props) {
  const router = useRouter()

  const coverPhoto = stop.cover_photo_id
    ? photos.find((p) => p.id === stop.cover_photo_id) ?? null
    : null

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: '#faf6f1' }}
    >
      {/* ── Header ── */}
      <header className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid #ecddc8' }}>
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 mb-4 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#c4663a' }}
        >
          <span aria-hidden="true" className="text-base">←</span>
          <span>Volver al mapa</span>
        </button>

        {/* Stop name */}
        <h1
          className="font-serif text-3xl font-bold leading-tight"
          style={{ color: '#5a3820' }}
        >
          {stop.name}
        </h1>

        {/* Country + flag */}
        <p
          className="mt-1 text-base"
          style={{ color: '#8a6040' }}
        >
          {stop.flag} {stop.country}
        </p>

        {/* Date range */}
        <p
          className="mt-0.5 text-sm"
          style={{ color: '#a07050' }}
        >
          {formatDateRange(stop.date_start, stop.date_end)}
        </p>
      </header>

      {/* ── Postcard text ── */}
      {stop.postcard_text && (
        <div
          className="mx-5 mt-5 px-4 py-3 rounded-r-lg italic text-base leading-relaxed"
          style={{
            borderLeft: '4px solid #c4663a',
            color: '#7a4828',
            backgroundColor: '#fff8f0',
            fontSize: '1.05rem',
          }}
        >
          {stop.postcard_text}
        </div>
      )}

      {/* ── Hero image ── */}
      {coverPhoto && (
        <div
          className="mx-5 mt-5 rounded-2xl overflow-hidden shadow-md cursor-pointer"
          style={{ aspectRatio: '16/9', position: 'relative' }}
          onClick={() => router.push(`/stops/${stop.id}/photos/${coverPhoto.id}`)}
        >
          {coverPhoto.media_type === 'video' ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: '#2a1a0e', minHeight: '200px' }}
            >
              <span
                className="text-5xl select-none"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
                aria-label="Video"
              >
                ▶
              </span>
            </div>
          ) : (
            <Image
              src={heroUrl(coverPhoto)}
              alt={`Foto de portada de ${stop.name}`}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          )}
        </div>
      )}

      {/* ── Photo count + grid ── */}
      <div className="px-5 mt-5 flex-1">
        {photos.length === 0 ? (
          /* Empty state */
          <div
            className="text-center py-16 rounded-2xl"
            style={{ backgroundColor: '#fff8f0', border: '1.5px dashed #ddc8a8' }}
          >
            <p
              className="text-base"
              style={{ color: '#8a6040' }}
            >
              Renata todavía no subió fotos de {stop.name} ✈️
            </p>
          </div>
        ) : (
          <>
            {/* Count */}
            <p
              className="text-sm font-medium mb-3"
              style={{ color: '#8a6040' }}
            >
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </p>

            {/* Grid */}
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
            >
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative rounded-lg overflow-hidden cursor-pointer"
                  style={{
                    aspectRatio: '1 / 1',
                    backgroundColor: '#e8d8c8',
                  }}
                  onClick={() => router.push(`/stops/${stop.id}/photos/${photo.id}`)}
                >
                  {photo.media_type === 'video' ? (
                    /* Video cell — dark bg with play overlay */
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: '#2a1a0e' }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full w-10 h-10"
                        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                      >
                        <span
                          className="text-white text-lg select-none"
                          style={{ marginLeft: '2px' }}
                          aria-label="Video"
                        >
                          ▶
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Photo cell */
                    <>
                      <Image
                        src={mediaUrl(photo)}
                        alt={`Foto de ${stop.name}`}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Reactions summary ── */}
      {photos.length > 0 && (
        <div
          className="mx-5 mt-6 mb-8 text-center rounded-xl py-3 px-4 text-sm"
          style={{
            backgroundColor: '#fff0e4',
            border: '1px solid #e8cca8',
            color: '#8a5030',
          }}
        >
          {totalReactions === 0
            ? 'Todavía no hay reacciones en este destino'
            : `${totalReactions} ${totalReactions === 1 ? 'reacción' : 'reacciones'} en total`}
        </div>
      )}
    </div>
  )
}
