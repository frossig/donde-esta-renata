export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: '#faf6f1' }}
    >
      {/* Spinning circle */}
      <div
        className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: '#c4956a', borderTopColor: 'transparent' }}
      />
      <p
        className="text-sm font-medium tracking-wide"
        style={{ color: '#8a6040' }}
      >
        Cargando...
      </p>
    </div>
  )
}
