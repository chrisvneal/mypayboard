export type SupabaseUser = {
  id: string
  clerk_id: string
  name: string
}

/**
 * Legacy free-form owner value (Clerk id, 'shared', or lowercase name
 * literal) -> Supabase users.id uuid, or null if unresolved/shared.
 */
export function resolveOwnerUuid(
  owner: string | undefined,
  users: SupabaseUser[]
): string | null {
  if (!owner || owner === 'shared') return null

  const byClerkId = users.find(u => u.clerk_id === owner)
  if (byClerkId) return byClerkId.id

  const byName = users.find(u => u.name.toLowerCase() === owner.toLowerCase())
  if (byName) return byName.id

  console.warn(`MyPayBoard: could not resolve owner "${owner}" to a household member`)
  return null
}

/** Reverse direction: Supabase owner uuid -> app-convention owner value (Clerk id). */
export function ownerFromUuid(
  ownerUuid: string | null | undefined,
  users: SupabaseUser[]
): string | undefined {
  if (!ownerUuid) return undefined
  return users.find(u => u.id === ownerUuid)?.clerk_id
}
