'use client'

import { useRef, useState } from 'react'

interface Stop {
  id: string
  name: string
  flag: string
  country: string
}

interface UploadResult {
  key: string
  stopId: string | null
  assignment: string
  photoId: string
}

export default function UploadForm({ stops }: { stops: Stop[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedStopId, setSelectedStopId] = useState<string>('auto')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0) // 0–100
  const [results, setResults] = useState<UploadResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResults(null)

    const files = fileInputRef.current?.files
    if (!files || files.length === 0) {
      setError('Selecciona al menos un archivo.')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // Step 1: Request presigned PUT URLs
      const signRes = await fetch('/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: Array.from(files).map((f) => ({ name: f.name, type: f.type })),
        }),
      })

      if (!signRes.ok) {
        const err = (await signRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Error al obtener URLs de subida')
      }

      const { uploads } = (await signRes.json()) as {
        uploads: Array<{ key: string; url: string; originalName: string }>
      }

      // Step 2: PUT each file directly to R2
      const fileArray = Array.from(files)
      let completed = 0

      await Promise.all(
        uploads.map(async (upload, i) => {
          const file = fileArray[i]
          const putRes = await fetch(upload.url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          if (!putRes.ok) {
            throw new Error(`Error al subir ${file.name}: ${putRes.status}`)
          }
          completed++
          // Progress covers 10–80% of the bar during uploads
          setProgress(10 + Math.round((completed / uploads.length) * 70))
        }),
      )

      setProgress(85)

      // Step 3: Process uploads
      const processRes = await fetch('/api/upload/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: uploads.map((u) => ({
            key: u.key,
            stopId: selectedStopId,
          })),
        }),
      })

      if (!processRes.ok) {
        const err = (await processRes.json()) as { error?: string }
        throw new Error(err.error ?? 'Error al procesar las fotos')
      }

      const { results: processResults } = (await processRes.json()) as {
        results: UploadResult[]
      }

      setProgress(100)
      setResults(processResults)

      // Reset form
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  // Compute summary
  const stopName =
    selectedStopId === 'auto'
      ? 'auto-detectado'
      : (stops.find((s) => s.id === selectedStopId)?.name ?? selectedStopId)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stop selector */}
      <div>
        <label htmlFor="stop-select" className="block text-sm font-medium text-stone-700 mb-1">
          Destino
        </label>
        <select
          id="stop-select"
          value={selectedStopId}
          onChange={(e) => setSelectedStopId(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={uploading}
        >
          <option value="auto">Auto-detectar por EXIF</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.flag} {stop.name}, {stop.country}
            </option>
          ))}
        </select>
      </div>

      {/* File input */}
      <div>
        <label htmlFor="file-input" className="block text-sm font-medium text-stone-700 mb-1">
          Fotos y videos
        </label>
        <input
          id="file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          disabled={uploading}
          className="block w-full text-sm text-stone-600
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-amber-50 file:text-amber-700
            hover:file:bg-amber-100
            disabled:opacity-50"
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Subiendo...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2.5">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-white font-medium
          hover:bg-amber-600 active:bg-amber-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors"
      >
        {uploading ? 'Subiendo...' : 'Subir fotos'}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Success summary */}
      {results && results.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-green-800">
            {results.length} {results.length === 1 ? 'foto subida' : 'fotos subidas'} a{' '}
            <span className="font-semibold">{stopName}</span>
          </p>
          <ul className="mt-2 space-y-1">
            {results.map((r) => (
              <li key={r.photoId} className="text-xs text-green-700">
                {r.key.split('/').pop()} — stop: {r.stopId ?? 'sin asignar'} ({r.assignment})
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
