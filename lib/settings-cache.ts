/**
 * Household membership/role cache for the Settings page — mirrors the
 * identity cache in lib/hooks/useUsers.ts. Who's in the household and who
 * owns it is effectively static (changes only on invite-accept or ownership
 * transfer, both rare), so it's safe to seed synchronously from the last-
 * known value on mount and reconcile against the server in the background
 * rather than blocking first paint on a network round trip every visit.
 *
 * Keyed by Clerk user id, matching the mypayboard-theme-cache-{userId} and
 * mypayboard-identity-{clerkId} conventions.
 */

import type { HouseholdMemberRole } from './types'

const SETTINGS_CACHE_PREFIX = 'mypayboard-members-'

export type CachedSettingsBootstrap = {
  roleByUserId: Record<string, HouseholdMemberRole>
  myRole: HouseholdMemberRole | null
  hasSampleData: boolean
}

export function readSettingsCache(userId: string): CachedSettingsBootstrap | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${SETTINGS_CACHE_PREFIX}${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedSettingsBootstrap>
    if (!parsed || typeof parsed.roleByUserId !== 'object' || parsed.roleByUserId === null) return null
    return {
      roleByUserId: parsed.roleByUserId,
      myRole: parsed.myRole ?? null,
      hasSampleData: parsed.hasSampleData ?? false,
    }
  } catch {
    return null
  }
}

export function writeSettingsCache(userId: string, data: CachedSettingsBootstrap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${SETTINGS_CACHE_PREFIX}${userId}`, JSON.stringify(data))
  } catch {
    // Best-effort — a missed write just means the next reload resolves
    // over the network again.
  }
}
