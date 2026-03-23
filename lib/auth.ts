import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export type Role = 'family' | 'admin'

export async function getRoleFromCookies(): Promise<Role | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (session === 'family' || session === 'admin') return session as Role
  return null
}

export function getRole(request: NextRequest): Role | null {
  const session = request.cookies.get('session')?.value
  if (session === 'family' || session === 'admin') {
    return session
  }
  return null
}

export function isAdmin(request: NextRequest): boolean {
  return getRole(request) === 'admin'
}

export function getRequiredRole(request: NextRequest): Role | null {
  return getRole(request)
}
