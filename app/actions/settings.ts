'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { HouseholdMemberRole, HouseholdMemberWithUser } from '@/lib/types'

const SAMPLE_TABLES = ['creditors', 'incomes', 'board_templates', 'boards'] as const

type MemberRow = {
  id: string
  household_id: string
  user_id: string
  role: string
  created_at: string
  users:
    | { id: string; clerk_id: string; name: string; display_name: string | null; avatar_color: string; email: string | null }
    | { id: string; clerk_id: string; name: string; display_name: string | null; avatar_color: string; email: string | null }[]
    | null
}

/**
 * Combined data fetch for the Settings page's Members/Data cards —
 * household membership + roles, and whether any seeded demo rows are still
 * around to offer "Start Fresh" for. Merged into one action (rather than the
 * two this replaced) so there's a single auth()/getToken() round trip
 * instead of two independent ones; the two Supabase queries this still needs
 * run in parallel via Promise.all since neither depends on the other, only
 * on the household id resolved first.
 */
export async function getSettingsBootstrap(): Promise<{
  success: boolean
  members?: HouseholdMemberWithUser[]
  myRole?: HouseholdMemberRole
  hasSampleData?: boolean
  message?: string
}> {
  const { userId: clerkId, getToken } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  // Resolve the Supabase JWT once and reuse it for every query below —
  // supabase-js calls its accessToken callback fresh per request, so without
  // this every query here would otherwise mint its own token from Clerk.
  const token = await getToken({ template: 'supabase' })
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => token ?? null }
  )

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, household_id')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  const [membersResult, sampleCountResults] = await Promise.all([
    supabase
      .from('household_members')
      .select(
        'id, household_id, user_id, role, created_at, users:user_id (id, clerk_id, name, display_name, avatar_color, email)'
      )
      .eq('household_id', me.household_id)
      .order('created_at', { ascending: true })
      .returns<MemberRow[]>(),
    Promise.all(
      SAMPLE_TABLES.map(table =>
        supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('household_id', me.household_id)
          .eq('is_sample', true)
      )
    ),
  ])

  const { data: rows, error: rowsError } = membersResult
  if (rowsError || !rows) return { success: false, message: 'Failed to load members.' }

  const members: HouseholdMemberWithUser[] = rows.map(row => {
    const user = Array.isArray(row.users) ? row.users[0] : row.users
    return {
      id: row.id,
      householdId: row.household_id,
      userId: row.user_id,
      role: row.role as HouseholdMemberRole,
      createdAt: row.created_at,
      user: {
        // App-layer User.id is the Clerk id everywhere else (see useUsers /
        // useMyPayBoard's data.users) — not the Supabase users.id uuid.
        // Falling back to row.user_id (the uuid) would silently mismatch
        // every client-side lookup keyed off data.users[].id.
        id: user?.clerk_id ?? row.user_id,
        name: user?.name ?? 'Unknown',
        displayName: user?.display_name ?? undefined,
        avatarColor: user?.avatar_color ?? '#B8D4F0',
        email: user?.email ?? undefined,
      },
    }
  })

  const myRole = members.find(m => m.userId === me.id)?.role

  const countError = sampleCountResults.find(r => r.error)?.error
  if (countError) {
    console.error('getSettingsBootstrap: sample-data count query failed', countError)
  }
  const hasSampleData = countError ? false : sampleCountResults.some(r => (r.count ?? 0) > 0)

  return { success: true, members, myRole, hasSampleData }
}
