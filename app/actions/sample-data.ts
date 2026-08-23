'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { resolveHouseholdId } from '@/lib/supabase/household'

/**
 * Deletes every seeded demo row still tagged `is_sample = true` for the
 * caller's household. Runs as a single Postgres function call (wipe_sample_data)
 * so all four table deletes commit or roll back together. Household scope is
 * resolved server-side from the authenticated user, never trusted from the
 * client; RLS on each table double-checks the household match regardless.
 */
export async function startFresh(): Promise<{ success: boolean; message: string }> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const supabase = await createClient()

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  const householdId = await resolveHouseholdId(supabase, me.id)
  if (!householdId) return { success: false, message: 'Could not resolve your household.' }

  const { error: wipeError } = await supabase.rpc('wipe_sample_data', {
    p_household_id: householdId,
  })

  if (wipeError) {
    console.error('startFresh: wipe failed', wipeError)
    return { success: false, message: 'Failed to clear sample data. Please try again.' }
  }

  return { success: true, message: 'Sample data cleared.' }
}
