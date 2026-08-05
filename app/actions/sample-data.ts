'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

const SAMPLE_TABLES = ['creditors', 'incomes', 'board_templates', 'boards'] as const

/** Whether the current household still has any seeded demo rows left to wipe. */
export async function getHasSampleData(): Promise<{ success: boolean; hasSampleData?: boolean; message?: string }> {
  const { userId: clerkId } = await auth()
  if (!clerkId) return { success: false, message: 'Not authenticated.' }

  const supabase = await createClient()

  const { data: me, error: meError } = await supabase
    .from('users')
    .select('household_id')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  const counts = await Promise.all(
    SAMPLE_TABLES.map(table =>
      supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('household_id', me.household_id)
        .eq('is_sample', true)
    )
  )

  const countError = counts.find(r => r.error)?.error
  if (countError) {
    console.error('getHasSampleData: count query failed', countError)
    return { success: false, message: 'Could not check for sample data.' }
  }

  return { success: true, hasSampleData: counts.some(r => (r.count ?? 0) > 0) }
}

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
    .select('household_id')
    .eq('clerk_id', clerkId)
    .single()

  if (meError || !me) return { success: false, message: 'Could not resolve your account.' }

  const { error: wipeError } = await supabase.rpc('wipe_sample_data', {
    p_household_id: me.household_id,
  })

  if (wipeError) {
    console.error('startFresh: wipe failed', wipeError)
    return { success: false, message: 'Failed to clear sample data. Please try again.' }
  }

  return { success: true, message: 'Sample data cleared.' }
}
