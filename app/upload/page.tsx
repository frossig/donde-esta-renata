import { redirect } from 'next/navigation'
import { getRoleFromCookies } from '@/lib/auth'
import { getDb } from '@/lib/db'
import UploadForm from './UploadForm'

export default async function UploadPage() {
  const role = await getRoleFromCookies()
  if (role !== 'admin') redirect('/')

  const db = await getDb()
  const stopsResult = await db.execute(
    `SELECT id, name, flag, country FROM stops ORDER BY display_order ASC`,
  )

  const stops = stopsResult.rows.map((r) => ({
    id:      r.id      as string,
    name:    r.name    as string,
    flag:    r.flag    as string,
    country: r.country as string,
  }))

  return (
    <main className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="mx-auto max-w-lg">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Subir fotos</h1>
          <p className="mt-1 text-sm text-stone-500">
            Las fotos se suben directamente a Cloudflare R2. El EXIF se procesa en el servidor.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <UploadForm stops={stops} />
        </div>

        <p className="mt-4 text-center">
          <a href="/" className="text-sm text-amber-600 hover:underline">
            Volver al mapa
          </a>
        </p>
      </div>
    </main>
  )
}
