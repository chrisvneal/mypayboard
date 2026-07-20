/**
 * Household member count — single source of truth for "is this a
 * multi-person household" checks app-wide.
 *
 * Interim implementation: there is no `household_members` table yet, so
 * this simply counts the already-loaded household member list, which itself
 * comes from the `users` table filtered by `household_id` (see
 * `lib/hooks/useUsers.ts`). When the invite system ships and
 * `household_members` exists, this is the only function that needs to
 * change (swap its source to a household_members count) — every caller
 * (`canSelectSharedOwner`, `resolveOwnerDisplayLabel`,
 * `useHouseholdMemberCount`, etc.) keeps working unchanged.
 */
export function getHouseholdMemberCount(users: readonly unknown[]): number {
  return users.length
}

/**
 * "Shared" is only meaningful when more than one person is in the household.
 * Single-person workspaces never offer it as an owner choice.
 */
export function canSelectSharedOwner(users: readonly unknown[]): boolean {
  return getHouseholdMemberCount(users) >= 2
}

/** Prefer the current user when present in the list; otherwise the first member. */
export function resolveDefaultOwnerId(
  users: readonly { id: string }[],
  preferredId?: string | null
): string {
  if (preferredId && users.some(u => u.id === preferredId)) return preferredId
  return users[0]?.id ?? ''
}
