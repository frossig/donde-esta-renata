'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Cookies from 'js-cookie'
import type { PhotoData, ReactionData } from '@/lib/types'

export type { PhotoData, ReactionData }

interface Props {
  stop: { id: string; name: string }
  photos: PhotoData[]
  currentPhotoIndex: number
  initialReactions: ReactionData[]
  isAdmin?: boolean
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
  isAdmin = false,
}: Props) {
  const router = useRouter()
  const photo = photos[currentPhotoIndex]
  const total = photos.length

  // ── Reactions state ──
  const [reactions, setReactions] = useState<ReactionData[]>(initialReactions)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Name modal state ──
  const [showNameModal, setShowNameModal] = useState(false)
  const [savedName, setSavedName] = useState<ReactorName | null>(null)

  // Read reactor_name cookie on mount
  useEffect(() => {
    const saved = Cookies.get(REACTOR_COOKIE)
    if (saved && (REACTOR_NAMES as readonly string[]).includes(saved)) {
      setSavedName(saved as ReactorName)
    }
  }, [])

  // ── Share state ──
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const handleShare = () => {
    navigator.share({ title: stop.name, url: window.location.href }).catch(() => {})
  }

  // Reset reactions when navigating to a different photo
  useEffect(() => {
    setReactions(initialReactions)
  }, [photo.id, initialReactions])

  // ── Navigation ──
  const hasPrev = currentPhotoIndex > 0
  const hasNext = currentPhotoIndex < total - 1

  const goToPrev = useCallback(() => {
    if (!hasPrev) return
    const prev = photos[currentPhotoIndex - 1]
    router.replace(`/stops/${stop.id}/photos/${prev.id}`)
  }, [hasPrev, photos, currentPhotoIndex, router, stop.id])

  const goToNext = useCallback(() => {
    if (!hasNext) return
    const next = photos[currentPhotoIndex + 1]
    router.replace(`/stops/${stop.id}/photos/${next.id}`)
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

  // ── Emoji selection ──
  const handleSelectEmoji = (emoji: string) => {
    setSelectedEmoji((prev) => (prev === emoji ? null : emoji))
  }

  // ── Submit reaction (called after name is confirmed in modal) ──
  const canSubmit = selectedEmoji !== null || comment.trim().length > 0

  const handleOpenModal = () => {
    if (!canSubmit || submitting) return
    setSubmitError(null)
    setShowNameModal(true)
  }

  const handleNameConfirmed = async (name: ReactorName) => {
    setSavedName(name)
    Cookies.set(REACTOR_COOKIE, name, { expires: 30 })
    setShowNameModal(false)
    setSubmitting(true)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.id,
          emoji: selectedEmoji,
          comment: comment.trim() || null,
          reactor: name,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSubmitError((data as { error?: string }).error ?? 'Error al reaccionar')
        return
      }
      const updated = await fetch(`/api/reactions?photoId=${photo.id}`)
      if (updated.ok) {
        const data = await updated.json()
        setReactions((data as { reactions: ReactionData[] }).reactions ?? [])
      }
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

        <div className="flex items-center gap-3">
          {canShare && (
            <button
              onClick={handleShare}
              aria-label="Compartir foto"
              className="flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
              style={{ color: '#8a6040' }}
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          )}
          <span
            className="text-sm font-medium tabular-nums"
            style={{ color: '#8a6040' }}
          >
            {currentPhotoIndex + 1} / {total}
          </span>
        </div>
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
              {...(photo.thumbnail_key != null
                ? { poster: `/api/media/${encodeURIComponent(photo.thumbnail_key)}` }
                : {})}
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

        {/* ── Reaction panel — hidden for admin (Renata) ── */}
        {isAdmin && (
          <p className="mx-4 mt-4 mb-6 text-sm italic text-center" style={{ color: '#a09080' }}>
            Las reacciones son para la familia 💛
          </p>
        )}
        {!isAdmin && (
        <div className="mx-4 mt-4 mb-6 flex flex-col gap-4">

          {/* Emoji picker */}
          <div className="flex gap-2 justify-center">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelectEmoji(emoji)}
                className="text-2xl rounded-xl p-1.5 transition-all"
                style={
                  selectedEmoji === emoji
                    ? { backgroundColor: '#fff0e4', border: '2px solid #c4663a', transform: 'scale(1.15)' }
                    : { backgroundColor: 'transparent', border: '2px solid transparent' }
                }
                aria-label={emoji}
                aria-pressed={selectedEmoji === emoji}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Comment field */}
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Dejá un comentario..."
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
              style={{
                backgroundColor: '#fff8f0',
                border: '1.5px solid #ddc8a8',
                color: '#5a3820',
                fontFamily: 'inherit',
              }}
            />
            <p className="text-right text-xs mt-1" style={{ color: comment.length >= 180 ? '#c4663a' : '#a07050' }}>
              {comment.length} / 200
            </p>
          </div>

          {/* Submit button */}
          {submitError && (
            <p className="text-sm" style={{ color: '#c4663a' }}>{submitError}</p>
          )}
          <button
            onClick={handleOpenModal}
            disabled={!canSubmit || submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={
              canSubmit && !submitting
                ? { backgroundColor: '#c4663a', color: '#fff', cursor: 'pointer' }
                : { backgroundColor: '#e8d0bc', color: '#b09070', cursor: 'not-allowed' }
            }
          >
            {submitting ? 'Enviando...' : 'Reaccionar'}
          </button>
        </div>
        )}

        {/* ── ¿Quién sos? modal ── */}
        {showNameModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowNameModal(false)}
          >
            <div
              className="w-full rounded-t-3xl p-6 pb-10"
              style={{ backgroundColor: '#faf6f1', maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: '#d4c4b0' }} />
              <p className="font-serif font-bold text-xl text-center mb-1" style={{ color: '#3d2b1f' }}>
                ¿Quién sos?
              </p>
              {savedName && (
                <p className="text-sm text-center mb-4" style={{ color: '#9a7456' }}>
                  La última vez fuiste <strong>{savedName}</strong>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {REACTOR_NAMES.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleNameConfirmed(name)}
                    className="py-3 rounded-2xl font-semibold text-base transition-all active:scale-95"
                    style={
                      savedName === name
                        ? { backgroundColor: '#c4663a', color: '#fff' }
                        : { backgroundColor: '#f0e8dc', color: '#6b3820', border: '1.5px solid #ddc8a8' }
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
