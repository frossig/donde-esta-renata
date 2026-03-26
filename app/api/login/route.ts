import { cookies } from 'next/headers'

export async function POST(request: Request) {
  if (!process.env.FAMILY_PASSWORD || !process.env.ADMIN_PASSWORD) {
    console.error('Missing required env vars: FAMILY_PASSWORD and/or ADMIN_PASSWORD')
    return Response.json({ error: 'Server misconfiguration: passwords not set.' }, { status: 500 })
  }

  const body = await request.json()
  const { password } = body

  if (!password) {
    return Response.json({ error: 'Password required' }, { status: 400 })
  }

  let role: 'family' | 'admin' | null = null

  // Note: not using crypto.timingSafeEqual here — low-risk for this use case
  // (family PWA, no public attacker timing oracle), but consider upgrading if
  // ever deployed more broadly.
  if (password === process.env.FAMILY_PASSWORD) {
    role = 'family'
  } else if (password === process.env.ADMIN_PASSWORD) {
    role = 'admin'
  }

  if (!role) {
    return Response.json({ error: 'Invalid password' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('session', role, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  return Response.json({ role })
}
