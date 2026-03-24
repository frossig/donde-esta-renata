'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
      style={{ backgroundColor: '#faf6f1' }}
    >
      <h1
        className="font-serif text-5xl font-bold"
        style={{ color: '#5a4636' }}
      >
        Algo salió mal
      </h1>

      <p
        className="text-base text-center max-w-sm"
        style={{ color: '#8a6040' }}
      >
        Ocurrió un error inesperado. Puedes intentarlo de nuevo.
      </p>

      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-85"
        style={{ backgroundColor: '#c4956a' }}
      >
        Reintentar
      </button>
    </div>
  )
}
