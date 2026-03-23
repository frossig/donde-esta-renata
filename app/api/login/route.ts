import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const body = await request.json()
  const { password } = body

  if (!password) {
    return Response.json({ error: 'Password required' }, { status: 400 })
  }

  let role: 'family' | 'admin' | null = null

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
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  return Response.json({ role })
}
