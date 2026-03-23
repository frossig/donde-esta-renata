'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Contraseña incorrecta')
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{ backgroundColor: '#faf6f1' }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-md"
        style={{ backgroundColor: '#fff8f2', border: '1px solid #e8d8c8' }}
      >
        {/* Heading */}
        <h1
          className="text-center font-serif text-3xl font-bold mb-1"
          style={{ color: '#6b3f1f' }}
        >
          Donde está Renata
        </h1>

        <p
          className="text-center text-sm mb-8"
          style={{ color: '#a07050' }}
        >
          ✈️ ingresá para seguir el viaje
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
              style={{ color: '#7a4f30' }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-shadow disabled:opacity-60"
              style={{
                border: '1.5px solid #d4a882',
                backgroundColor: '#fffaf6',
                color: '#3d1f0a',
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 3px #e07842aa'
                e.currentTarget.style.borderColor = '#e07842'
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.borderColor = '#d4a882'
              }}
            />
          </div>

          {error && (
            <p
              className="text-sm text-center rounded-lg px-3 py-2"
              style={{ color: '#a03020', backgroundColor: '#fde8e0' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: loading ? '#c4956a' : '#e07842' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
