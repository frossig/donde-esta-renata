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

export function requireAuth(request: NextRequest): Role {
  const role = getRole(request)
  if (!role) {
    throw new Error('Unauthenticated')
  }
  return role
}
