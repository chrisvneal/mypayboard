import type { User } from '@/lib/types'
import { getHouseholdMemberCount } from '@/lib/owner-options'

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

/**
 * Resolve income/bill/card owner id (or 'shared', or unset) to a
 * household-visible label.
 *
 * "Shared" is only a meaningful concept once a household has 2+ members —
 * a single-person household has nothing to share with, so it must never be
 * displayed there. In that case the sole member's name is the only value
 * that can ever be shown, even for legacy rows saved as 'shared'/blank
 * before that member was the only one, or for an owner id that no longer
 * resolves. See `getHouseholdMemberCount` for the member-count source of
 * truth this defers to.
 */
export function resolveOwnerDisplayLabel(
  ownerId: string | undefined,
  users: readonly Pick<User, 'id' | 'name' | 'displayName'>[]
): string {
  const matched = ownerId && ownerId !== 'shared' ? users.find(u => u.id === ownerId) : undefined
  if (matched) return getUserDisplayName(matched)

  if (getHouseholdMemberCount(users) === 1) return getUserDisplayName(users[0])

  if (ownerId && ownerId !== 'shared') return 'Unknown'
  return 'Shared'
}
