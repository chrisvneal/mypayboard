import { currentUser } from '@clerk/nextjs/server'
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

  // First login — create household
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({
      name: 'My Household',
      app_version: '1.0'
    })
    .select('id')
    .single()

  if (householdError || !household) {
    console.error('Failed to create household:', householdError)
    return null
  }

  // Create user record linked to household
  const primaryEmail = user.emailAddresses?.[0]?.emailAddress ?? null
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : (primaryEmail ?? 'User')

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      household_id: household.id,
      clerk_id: clerkUserId,
      name: displayName,
      email: primaryEmail,
      avatar_color: '#185FA5',
      role: 'admin'
    })
    .select('id')
    .single()

  if (userError || !newUser) {
    // 23505 = unique_violation. A duplicate clerk_id here means the
    // existingUser lookup above spuriously missed a real, already-onboarded
    // user (e.g. a transient Clerk session hiccup) — self-heal by re-querying
    // instead of leaving the caller stuck, and clean up the household this
    // request just created (now orphaned, nothing else references it) so
    // retries of this same race don't keep accumulating empty households.
    if (userError?.code === '23505') {
      await supabase.from('households').delete().eq('id', household.id)
      const { data: recovered } = await supabase
        .from('users')
        .select('id, household_id')
        .eq('clerk_id', clerkUserId)
        .single()
      if (recovered) {
        return {
          onboarded: true,
          userId: recovered.id,
          householdId: recovered.household_id
        }
      }
    }
    console.error('Failed to create user:', userError)
    return null
  }

  // Create default user_prefs row
  await supabase.from('user_prefs').insert({
    user_id: newUser.id,
    household_id: household.id,
    prefs: {
      theme: 'daylight',
      has_seen_onboarding: false
    }
  })

  return {
    onboarded: false,
    userId: newUser.id,
    householdId: household.id
  }
}
