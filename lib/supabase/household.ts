import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves a user's household via household_members — the source of truth
 * for household scoping, replacing the old users.household_id column reads.
 * Multi-household membership isn't supported yet, so the oldest row wins if
 * more than one ever exists (same oldest-row tie-break as
 * create_household_for_user's email-relink path).
 */
export async function resolveHouseholdId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data.household_id
}
