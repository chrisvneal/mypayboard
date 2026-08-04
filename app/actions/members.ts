'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { HouseholdMemberRole, HouseholdMemberWithUser } from '@/lib/types'

type MemberRow = {
  id: string
  household_id: string
  user_id: string
  role: string
  created_at: string
  users:
    | { id: string; name: string; display_name: string | null; avatar_color: string; email: string | null }
    | { id: string; name: string; display_name: string | null; avatar_color: string; email: string | null }[]
    | null
}

export async function getHouseholdMembers(): Promise<{
  success: boolean
  members?: HouseholdMemberWithUser[]
  myRole?: HouseholdMemberRole
  message?: string
}> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const supabase = await createClient()

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, household_id')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  const { data: rows, error: rowsError } = await supabase
    .from('household_members')
    .select(
      'id, household_id, user_id, role, created_at, users:user_id (id, name, display_name, avatar_color, email)'
    )
    .eq('household_id', me.household_id)
    .order('created_at', { ascending: true })
    .returns<MemberRow[]>()

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
        id: user?.id ?? row.user_id,
        name: user?.name ?? 'Unknown',
        displayName: user?.display_name ?? undefined,
        avatarColor: user?.avatar_color ?? '#B8D4F0',
        email: user?.email ?? undefined,
      },
    }
  })

  const myRole = members.find(m => m.userId === me.id)?.role

  return { success: true, members, myRole }
}
