import { currentUser } from '@clerk/nextjs/server'
import { DEFAULT_AVATAR_COLOR } from '@/components/modules/header-colors'
import { createAdminClient } from '@/lib/supabase/server'

type OnboardResult = {
  onboarded: boolean
  userId: string
  householdId: string
}

/**
 * Ensures a Clerk-authenticated user has a household + user record in
 * Supabase, creating them on first login. Callable directly from server
 * components (no HTTP round-trip) or from the /api/onboarding route.
 */
export async function ensureOnboarded(clerkUserId: string): Promise<OnboardResult | null> {
  const supabase = createAdminClient()

  const { data: existingUser } = await supabase
    .from('users')
    .select('id, household_id')
    .eq('clerk_id', clerkUserId)
    .single()

  if (existingUser) {
    return {
      onboarded: true,
      userId: existingUser.id,
      householdId: existingUser.household_id
    }
  }

  const user = await currentUser()
  if (!user) return null

  const primaryEmail = user.emailAddresses?.[0]?.emailAddress ?? null
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : (primaryEmail ?? 'User')

  // First login — create household + user + user_prefs atomically. The RPC
  // takes a Postgres advisory lock keyed on clerk_id so concurrent requests
  // for the same new user queue instead of racing into duplicate households.
  const { data: result, error: rpcError } = await supabase.rpc('create_household_for_user', {
    p_clerk_id: clerkUserId,
    p_name: displayName,
    p_email: primaryEmail,
    p_avatar_color: DEFAULT_AVATAR_COLOR
  })

  if (rpcError || !result) {
    console.error('Failed to onboard user:', rpcError)
    return null
  }

  return {
    onboarded: !result.created,
    userId: result.userId,
    householdId: result.householdId
  }
}
