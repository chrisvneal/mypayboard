import type { User } from '@/lib/types'
import { getHouseholdMemberCount } from '@/lib/owner-options'

/** Household-visible name: nickname when set, otherwise Google account name. */
export function getUserDisplayName(user: Pick<User, 'name' | 'displayName'>): string {
  const nick = user.displayName?.trim()
  return nick || user.name
}

/** Compact first-name-only variant of getUserDisplayName, for owner-picker dropdowns. */
export function getUserFirstName(user: Pick<User, 'name' | 'displayName'>): string {
  const displayName = getUserDisplayName(user)
  return displayName.split(' ')[0] || displayName
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
function resolveOwnerLabelCore(
  ownerId: string | undefined,
  users: readonly Pick<User, 'id' | 'name' | 'displayName'>[],
  nameOf: (user: Pick<User, 'name' | 'displayName'>) => string
): string {
  const matched = ownerId && ownerId !== 'shared' ? users.find(u => u.id === ownerId) : undefined
  if (matched) return nameOf(matched)

  if (getHouseholdMemberCount(users) === 1) return nameOf(users[0])

  if (ownerId && ownerId !== 'shared') return 'Unknown'
  return 'Shared'
}

export function resolveOwnerDisplayLabel(
  ownerId: string | undefined,
  users: readonly Pick<User, 'id' | 'name' | 'displayName'>[]
): string {
  return resolveOwnerLabelCore(ownerId, users, getUserDisplayName)
}

/** Compact first-name-only variant of resolveOwnerDisplayLabel, for tight card headers. */
export function resolveOwnerFirstNameLabel(
  ownerId: string | undefined,
  users: readonly Pick<User, 'id' | 'name' | 'displayName'>[]
): string {
  return resolveOwnerLabelCore(ownerId, users, getUserFirstName)
}
