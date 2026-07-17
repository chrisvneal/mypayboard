/**
 * "Shared" is only meaningful when more than one person is in the household.
 * Single-person workspaces never offer it as an owner choice.
 */
export function canSelectSharedOwner(users: readonly unknown[]): boolean {
  return users.length >= 2
}

/** Prefer the current user when present in the list; otherwise the first member. */
export function resolveDefaultOwnerId(
  users: readonly { id: string }[],
  preferredId?: string | null
): string {
  if (preferredId && users.some(u => u.id === preferredId)) return preferredId
  return users[0]?.id ?? ''
}
