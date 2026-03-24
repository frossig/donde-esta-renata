'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStop {
  id: string
  name: string
  country: string
  flag: string
  display_order: number
  is_current: number
  postcard_text: string | null
  cover_photo_id: string | null
  date_start: string
  date_end: string
}

export interface AdminTripStatus {
  state: 'at_stop' | 'in_transit'
  current_stop_id: string | null
  from_stop_id: string | null
  to_stop_id: string | null
  transport_mode: 'plane' | 'train' | 'bus' | null
  updated_at: string
}

export interface AdminPhoto {
  id: string
  stop_id: string | null
  r2_key: string
  thumbnail_key: string | null
  media_type: string
  uploaded_at: string
  assignment: string | null
}

interface Props {
  stops: AdminStop[]
  tripStatus: AdminTripStatus | null
  photos: AdminPhoto[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function thumbUrl(photo: AdminPhoto): string {
  const key = photo.thumbnail_key ?? photo.r2_key
  return `/api/media/${encodeURIComponent(key)}`
}

// ─── Trip Status Section ──────────────────────────────────────────────────────

function TripStatusSection({
  stops,
  initialStatus,
}: {
  stops: AdminStop[]
  initialStatus: AdminTripStatus | null
}) {
  const [mode, setMode] = useState<'at_stop' | 'in_transit'>(
    initialStatus?.state ?? 'at_stop',
  )
  const [currentStopId, setCurrentStopId] = useState<string>(
    initialStatus?.current_stop_id ?? (stops[0]?.id ?? ''),
  )
  const [fromStopId, setFromStopId] = useState<string>(
    initialStatus?.from_stop_id ?? (stops[0]?.id ?? ''),
  )
  const [toStopId, setToStopId] = useState<string>(
    initialStatus?.to_stop_id ?? (stops[1]?.id ?? stops[0]?.id ?? ''),
  )
  const [transportMode, setTransportMode] = useState<'plane' | 'train' | 'bus'>(
    initialStatus?.transport_mode ?? 'plane',
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const body =
        mode === 'at_stop'
          ? { state: 'at_stop', currentStopId }
          : { state: 'in_transit', fromStopId, toStopId, transportMode }

      const res = await fetch('/api/admin/trip-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (data.success) {
        setMessage('Guardado')
      } else {
        setMessage(`Error: ${data.error ?? 'Unknown error'}`)
      }
    } catch {
      setMessage('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const TRANSPORT_OPTS: { value: 'plane' | 'train' | 'bus'; label: string }[] = [
    { value: 'plane', label: '✈️ Avión' },
    { value: 'train', label: '🚂 Tren' },
    { value: 'bus', label: '🚌 Bus' },
  ]

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '1rem', color: '#7c4b2a' }}>
        ¿Dónde está Renata?
      </h2>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setMode('at_stop')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            border: '1.5px solid #c97d4e',
            background: mode === 'at_stop' ? '#c97d4e' : 'transparent',
            color: mode === 'at_stop' ? '#fff' : '#c97d4e',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Estoy en ciudad
        </button>
        <button
          onClick={() => setMode('in_transit')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            border: '1.5px solid #c97d4e',
            background: mode === 'in_transit' ? '#c97d4e' : 'transparent',
            color: mode === 'in_transit' ? '#fff' : '#c97d4e',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Viajando
        </button>
      </div>

      {mode === 'at_stop' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '320px' }}>
          <label style={{ fontSize: '0.85rem', color: '#555' }}>Parada actual</label>
          <select
            value={currentStopId}
            onChange={(e) => setCurrentStopId(e.target.value)}
            style={{ padding: '0.4rem', border: '1px solid #d5b89a', borderRadius: '6px', background: '#fffaf6' }}
          >
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.flag} {s.name}
                {s.is_current ? ' ★' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '0.25rem' }}>Desde</label>
            <select
              value={fromStopId}
              onChange={(e) => setFromStopId(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', border: '1px solid #d5b89a', borderRadius: '6px', background: '#fffaf6' }}
            >
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.flag} {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '0.25rem' }}>Hacia</label>
            <select
              value={toStopId}
              onChange={(e) => setToStopId(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', border: '1px solid #d5b89a', borderRadius: '6px', background: '#fffaf6' }}
            >
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.flag} {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#555', display: 'block', marginBottom: '0.25rem' }}>Transporte</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {TRANSPORT_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTransportMode(opt.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #c97d4e',
                    background: transportMode === opt.value ? '#fde8d0' : 'transparent',
                    cursor: 'pointer',
                    fontWeight: transportMode === opt.value ? 700 : 400,
                    color: '#7c4b2a',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.5rem 1.5rem',
            background: '#c97d4e',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {message && (
          <span style={{ fontSize: '0.85rem', color: message.startsWith('Error') ? '#c0392b' : '#27ae60' }}>
            {message}
          </span>
        )}
      </div>
    </section>
  )
}

// ─── Stop Postcard + Cover + Photos Section ───────────────────────────────────

function StopPostcardSection({
  stop,
  photos,
}: {
  stop: AdminStop
  photos: AdminPhoto[]
}) {
  const [text, setText] = useState(stop.postcard_text ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(
    stop.cover_photo_id ?? null,
  )
  const [savingCover, setSavingCover] = useState(false)
  const [coverMsg, setCoverMsg] = useState<string | null>(null)

  const [photoList, setPhotoList] = useState<AdminPhoto[]>(photos)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})

  async function handleSavePostcard() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/stops/${stop.id}/postcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      setSaveMsg(data.success ? 'Guardado' : `Error: ${data.error ?? ''}`)
    } catch {
      setSaveMsg('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCover() {
    if (!selectedPhotoId) return
    setSavingCover(true)
    setCoverMsg(null)
    try {
      const res = await fetch(`/api/admin/stops/${stop.id}/cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: selectedPhotoId }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      setCoverMsg(data.success ? 'Portada guardada' : `Error: ${data.error ?? ''}`)
    } catch {
      setCoverMsg('Error al guardar portada')
    } finally {
      setSavingCover(false)
    }
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (res.ok && data.success) {
        setPhotoList((prev) => prev.filter((p) => p.id !== photoId))
        if (selectedPhotoId === photoId) setSelectedPhotoId(null)
        setConfirmDeleteId(null)
      } else {
        setMessages(prev => ({
          ...prev,
          [photoId]: 'Error al eliminar. Intenta de nuevo.'
        }))
      }
    } catch {
      setMessages(prev => ({
        ...prev,
        [photoId]: 'Error al eliminar. Intenta de nuevo.'
      }))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #e8d5bf',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1rem',
        background: '#fffaf6',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'var(--font-serif)', color: '#7c4b2a' }}>
        {stop.flag} {stop.name}
      </h3>

      {/* Postcard text */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.8rem', color: '#777', display: 'block', marginBottom: '0.25rem' }}>
          Texto postal (máx. 300 chars)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          rows={3}
          style={{
            width: '100%',
            padding: '0.4rem',
            border: '1px solid #d5b89a',
            borderRadius: '6px',
            background: '#fff',
            resize: 'vertical',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: '0.75rem', color: '#999', textAlign: 'right' }}>{text.length}/300</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button
            onClick={handleSavePostcard}
            disabled={saving}
            style={{
              padding: '0.35rem 1rem',
              background: '#c97d4e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {saveMsg && (
            <span style={{ fontSize: '0.8rem', color: saveMsg.startsWith('Error') ? '#c0392b' : '#27ae60' }}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Cover photo picker */}
      {photoList.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.8rem', color: '#777', display: 'block', marginBottom: '0.5rem' }}>
            Portada
          </label>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
            }}
          >
            {photoList.map((photo) => (
              <div key={photo.id} style={{ position: 'relative', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(photo)}
                  alt=""
                  onClick={() => setSelectedPhotoId(photo.id)}
                  style={{
                    width: '72px',
                    height: '72px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: selectedPhotoId === photo.id ? '3px solid #c97d4e' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                />
                {/* Delete button */}
                <button
                  onClick={() => setConfirmDeleteId(photo.id)}
                  title="Eliminar"
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  🗑
                </button>
                {/* Confirm delete overlay */}
                {confirmDeleteId === photo.id && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.75)',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '4px',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '9px', textAlign: 'center' }}>¿Eliminar?</span>
                    {messages[photo.id] && (
                      <span style={{ color: '#f87171', fontSize: '8px', textAlign: 'center' }}>
                        {messages[photo.id]}
                      </span>
                    )}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleDelete(photo.id)}
                        disabled={deletingId === photo.id}
                        style={{
                          background: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '9px',
                          padding: '2px 5px',
                          cursor: 'pointer',
                        }}
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          background: '#888',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '9px',
                          padding: '2px 5px',
                          cursor: 'pointer',
                        }}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleSaveCover}
              disabled={savingCover || !selectedPhotoId}
              style={{
                padding: '0.35rem 1rem',
                background: '#c97d4e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: savingCover || !selectedPhotoId ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                opacity: savingCover || !selectedPhotoId ? 0.5 : 1,
              }}
            >
              {savingCover ? 'Guardando…' : 'Guardar portada'}
            </button>
            {coverMsg && (
              <span style={{ fontSize: '0.8rem', color: coverMsg.startsWith('Error') ? '#c0392b' : '#27ae60' }}>
                {coverMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Unassigned Photos Section ────────────────────────────────────────────────

function UnassignedPhotosSection({
  initialPhotos,
  stops,
}: {
  initialPhotos: AdminPhoto[]
  stops: AdminStop[]
}) {
  const [photos, setPhotos] = useState<AdminPhoto[]>(initialPhotos)
  const [assignments, setAssignments] = useState<Record<string, string>>(
    () => Object.fromEntries(initialPhotos.map((p) => [p.id, stops[0]?.id ?? ''])),
  )
  const [assigning, setAssigning] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, string>>({})

  async function handleAssign(photoId: string) {
    const stopId = assignments[photoId]
    if (!stopId) return
    setAssigning(photoId)
    try {
      const res = await fetch(`/api/admin/photos/${photoId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (data.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      } else {
        setMessages((prev) => ({ ...prev, [photoId]: `Error: ${data.error ?? ''}` }))
      }
    } catch {
      setMessages((prev) => ({ ...prev, [photoId]: 'Error al asignar' }))
    } finally {
      setAssigning(null)
    }
  }

  if (photos.length === 0) {
    return (
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.75rem', color: '#7c4b2a' }}>
          Fotos sin asignar
        </h2>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>No hay fotos sin asignar.</p>
      </section>
    )
  }

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.75rem', color: '#7c4b2a' }}>
        Fotos sin asignar
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid #e8d5bf',
              borderRadius: '8px',
              padding: '0.5rem',
              background: '#fffaf6',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbUrl(photo)}
              alt=""
              style={{
                width: '64px',
                height: '64px',
                objectFit: 'cover',
                borderRadius: '6px',
                flexShrink: 0,
              }}
            />
            <select
              value={assignments[photo.id] ?? ''}
              onChange={(e) =>
                setAssignments((prev) => ({ ...prev, [photo.id]: e.target.value }))
              }
              style={{
                padding: '0.35rem',
                border: '1px solid #d5b89a',
                borderRadius: '6px',
                background: '#fff',
                fontSize: '0.85rem',
                flex: 1,
              }}
            >
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.flag} {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleAssign(photo.id)}
              disabled={assigning === photo.id}
              style={{
                padding: '0.35rem 0.75rem',
                background: '#c97d4e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: assigning === photo.id ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                opacity: assigning === photo.id ? 0.7 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Asignar
            </button>
            {messages[photo.id] && (
              <span style={{ fontSize: '0.75rem', color: '#c0392b' }}>
                {messages[photo.id]}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Main AdminPanel ───────────────────────────────────────────────────────────

export default function AdminPanel({ stops, tripStatus, photos }: Props) {
  const photosByStop = stops.reduce<Record<string, AdminPhoto[]>>((acc, stop) => {
    acc[stop.id] = photos.filter((p) => p.stop_id === stop.id)
    return acc
  }, {})

  const unassignedPhotos = photos.filter((p) => p.stop_id === null)

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '1.5rem 1rem',
        fontFamily: 'var(--font-geist-sans), Arial, sans-serif',
        color: '#3a2a1e',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.75rem',
          marginBottom: '2rem',
          color: '#7c4b2a',
        }}
      >
        Panel de administración
      </h1>

      {/* Section 1: Trip status */}
      <TripStatusSection stops={stops} initialStatus={tripStatus} />

      <hr style={{ border: 'none', borderTop: '1px solid #e8d5bf', margin: '2rem 0' }} />

      {/* Section 2: Postcard text + cover + photos per stop */}
      <section style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            marginBottom: '1rem',
            color: '#7c4b2a',
          }}
        >
          Postales de cada parada
        </h2>
        {stops.map((stop) => (
          <StopPostcardSection
            key={stop.id}
            stop={stop}
            photos={photosByStop[stop.id] ?? []}
          />
        ))}
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #e8d5bf', margin: '2rem 0' }} />

      {/* Section 3: Unassigned photos */}
      <UnassignedPhotosSection initialPhotos={unassignedPhotos} stops={stops} />
    </div>
  )
}
