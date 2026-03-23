import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#faf6f1' }}
    >
      <h1
        className="font-serif text-8xl font-bold leading-none"
        style={{ color: '#5a3820' }}
      >
        404
      </h1>

      <p
        className="mt-4 text-xl text-center"
        style={{ color: '#8a6040' }}
      >
        Esta parada no existe 🗺️
      </p>

      <Link
        href="/"
        className="mt-8 px-6 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-85"
        style={{ backgroundColor: '#c4663a' }}
      >
        Volver al mapa
      </Link>
    </div>
  )
}
