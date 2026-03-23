'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Cookies from 'js-cookie'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotoData {
  id: string
  stop_id: string
  r2_key: string
  thumbnail_key: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  media_type: string
  uploaded_at: string
  assignment: string | null
}

export interface ReactionData {
  id: string
  photo_id: string
  emoji: string | null
  comment: string | null
  reactor: string
  created_at: string
}

interface Props {
  stop: { id: string; name: string }
  photos: PhotoData[]
  currentPhotoIndex: number
  initialReactions: ReactionData[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTOR_NAMES = ['Faus', 'Alfo', 'Papá', 'Mamá'] as const
type ReactorName = (typeof REACTOR_NAMES)[number]

const EMOJIS = ['❤️', '😍', '😂', '🤩', '👏'] as const

const REACTOR_COOKIE = 'reactor_name'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mediaUrl(r2Key: string): string {
  return `/api/media/${encodeURIComponent(r2Key)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotoViewer({
  stop,
  photos,
  currentPhotoIndex,
  initialReactions,
}: Props) {
  const router = useRouter()
  const photo = photos[currentPhotoIndex]
  const total = photos.length

  // ── Reactions state ──
  const [reactions, setReactions] = useState<ReactionData[]>(initialReactions)
  const [selectedName, setSelectedName] = useState<ReactorName | null>(null)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Read reactor_name cookie on mount
  useEffect(() => {
    const saved = Cookies.get(REACTOR_COOKIE)
    if (saved && (REACTOR_NAMES as readonly string[]).includes(saved)) {
      setSelectedName(saved as ReactorName)
    }
  }, [])

  // ── Navigation ──
  const hasPrev = currentPhotoIndex > 0
  const hasNext = currentPhotoIndex < total - 1

  const goToPrev = useCallback(() => {
    if (!hasPrev) return
    const prev = photos[currentPhotoIndex - 1]
    router.push(`/stops/${stop.id}/photos/${prev.id}`)
  }, [hasPrev, photos, currentPhotoIndex, router, stop.id])

  const goToNext = useCallback(() => {
    if (!hasNext) return
    const next = photos[currentPhotoIndex + 1]
    router.push(`/stops/${stop.id}/photos/${next.id}`)
  }, [hasNext, photos, currentPhotoIndex, router, stop.id])

  // ── Swipe detection ──
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(delta) < 50) return
    if (delta > 0) {
      goToNext()
    } else {
      goToPrev()
    }
  }

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goToPrev, goToNext])

  // ── Name selection ──
  const handleSelectName = (name: ReactorName) => {
    setSelectedName(name)
    Cookies.set(REACTOR_COOKIE, name, { expires: 30 })
  }

  // ── Emoji selection ──
  const handleSelectEmoji = (emoji: string) => {
    setSelectedEmoji((prev) => (prev === emoji ? null : emoji))
  }

  // ── Submit reaction ──
  const canSubmit =
    selectedName !== null && (selectedEmoji !== null || comment.trim().length > 0)

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.id,
          emoji: selectedEmoji,
          comment: comment.trim() || null,
          reactor: selectedName,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError((data as { error?: string }).error ?? 'Error al reaccionar')
        return
      }
      // Re-fetch reactions
      const updated = await fetch(`/api/reactions?photoId=${photo.id}`)
      if (updated.ok) {
        const data = await updated.json()
        setReactions((data as { reactions: ReactionData[] }).reactions ?? [])
      }
      // Reset form
      setSelectedEmoji(null)
      setComment('')
    } catch {
      setSubmitError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: '#faf6f1' }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #ecddc8' }}
      >
        <button
          onClick={() => router.push(`/stops/${stop.id}`)}
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#c4663a' }}
        >
          <span aria-hidden="true" className="text-base">←</span>
          <span>{stop.name}</span>
        </button>

        <span
          className="text-sm font-medium tabular-nums"
          style={{ color: '#8a6040' }}
        >
          {currentPhotoIndex + 1} / {total}
        </span>
      </div>

      {/* ── Photo / Video display ── */}
      <div
        className="relative flex-1 flex items-center justify-center select-none"
        style={{
          backgroundColor: '#1a0f08',
          minHeight: '55vw',
          maxHeight: '70vh',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={goToPrev}
            aria-label="Foto anterior"
            className="absolute left-3 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '1.2rem' }}
          >
            ‹
          </button>
        )}

        {/* Media */}
        <div className="relative w-full h-full" style={{ minHeight: '55vw', maxHeight: '70vh' }}>
          {photo.media_type === 'video' ? (
            <video
              key={photo.id}
              controls
              className="w-full h-full"
              style={{ objectFit: 'contain', maxHeight: '70vh' }}
              src={mediaUrl(photo.r2_key)}
            />
          ) : (
            <Image
              key={photo.id}
              src={mediaUrl(photo.r2_key)}
              alt={`Foto de ${stop.name}`}
              fill
              style={{ objectFit: 'contain' }}
              unoptimized
              priority
            />
          )}
        </div>

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={goToNext}
            aria-label="Foto siguiente"
            className="absolute right-3 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '1.2rem' }}
          >
            ›
          </button>
        )}
      </div>

      {/* ── Controls area (warm cream) ── */}
      <div style={{ backgroundColor: '#faf6f1' }}>

        {/* ── Existing reactions ── */}
        {reactions.length > 0 && (
          <div
            className="mx-4 mt-4 rounded-xl px-4 py-3"
            style={{ backgroundColor: '#fff0e4', border: '1px solid #e8cca8' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: '#a07050' }}
            >
              Reacciones
            </p>
            <div className="flex flex-col gap-1.5">
              {reactions.map((r) => (
                <div
                  key={r.id}
                  className="text-sm"
                  style={{ color: '#5a3820' }}
                >
                  {r.emoji && <span className="mr-1">{r.emoji}</span>}
                  <span className="font-medium">{r.reactor}</span>
                  {r.comment && (
                    <span style={{ color: '#7a4828' }}> · {r.comment}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reaction panel ── */}
        <div className="mx-4 mt-4 mb-6 flex flex-col gap-4">

          {/* Name selector */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: '#a07050' }}
            >
              ¿Quién sos?
            </p>
            <div className="flex gap-2 flex-wrap">
              {REACTOR_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => handleSelectName(name)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={
                    selectedName === name
                      ? { backgroundColor: '#c4663a', color: '#fff', border: '1.5px solid #c4663a' }
                      : { backgroundColor: 'transparent', color: '#c4663a', border: '1.5px solid #c4663a' }
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji picker */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: '#a07050' }}
            >
              Emoji (opcional)
            </p>
            <div className="flex gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectEmoji(emoji)}
                  className="text-2xl rounded-xl p-1.5 transition-all"
                  style={
                    selectedEmoji === emoji
                      ? {
                          backgroundColor: '#fff0e4',
                          border: '2px solid #c4663a',
                          transform: 'scale(1.15)',
                        }
                      : {
                          backgroundColor: 'transparent',
                          border: '2px solid transparent',
                        }
                  }
                  aria-label={emoji}
                  aria-pressed={selectedEmoji === emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Comment field */}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Dejá un comentario..."
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none transition-colors"
              style={{
                backgroundColor: '#fff8f0',
                border: '1.5px solid #ddc8a8',
                color: '#5a3820',
                fontFamily: 'inherit',
              }}
            />
            <p
              className="text-right text-xs mt-1"
              style={{ color: comment.length >= 180 ? '#c4663a' : '#a07050' }}
            >
              {comment.length} / 200
            </p>
          </div>

          {/* Submit button */}
          <div>
            {submitError && (
              <p className="text-sm mb-2" style={{ color: '#c4663a' }}>
                {submitError}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={
                canSubmit && !submitting
                  ? {
                      backgroundColor: '#c4663a',
                      color: '#fff',
                      cursor: 'pointer',
                    }
                  : {
                      backgroundColor: '#e8d0bc',
                      color: '#b09070',
                      cursor: 'not-allowed',
                    }
              }
            >
              {submitting ? 'Enviando...' : 'Reaccionar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
