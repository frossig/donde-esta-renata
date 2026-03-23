import type { NextRequest } from 'next/server'

export type Role = 'family' | 'admin'

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
