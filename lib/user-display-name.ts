import type { User } from '@/lib/types'

/** Household-visible name: nickname when set, otherwise Google account name. */
export function getUserDisplayName(user: Pick<User, 'name' | 'displayName'>): string {
  const nick = user.displayName?.trim()
  return nick || user.name
}

export function userDisplayInitials(user: Pick<User, 'name' | 'displayName'>): string {
  return getUserDisplayName(user)
    .split(' ')
    .map(p => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Resolve income/card owner id (or shared) to a household-visible label. */
export function resolveOwnerDisplayLabel(
  ownerId: string | undefined,
  users: readonly Pick<User, 'id' | 'name' | 'displayName'>[]
): string {
  if (!ownerId || ownerId === 'shared') return 'Shared'
  const user = users.find(u => u.id === ownerId)
  return user ? getUserDisplayName(user) : 'Unknown'
}
