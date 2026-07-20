'use client'

import { useMyPayBoard } from '@/lib/MyPayBoardProvider'
import { getHouseholdMemberCount } from '@/lib/owner-options'

/**
 * Household size, for gating any "Shared" option/display app-wide (income
 * sources, bills/creditors, pay date cards, etc.). See
 * `getHouseholdMemberCount` in `lib/owner-options.ts` for the interim vs.
 * future (`household_members` table) note — this hook is just the
 * React-friendly wrapper around it, reading from the already-hydrated
 * household member list.
 */
export function useHouseholdMemberCount(): number {
  const { data } = useMyPayBoard()
  return getHouseholdMemberCount(data.users)
}
