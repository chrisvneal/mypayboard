import { useUser, useSession } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'

type SupabaseUser = {
  id: string
  household_id: string
  clerk_id: string
  name: string
  email: string | null
  avatar_color: string
  role: string
}

export function useUsers() {
  const { user: clerkUser, isLoaded } = useUser()
  const { session, isLoaded: isSessionLoaded } = useSession()
  const supabase = useSupabaseClient()
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[DEBUG useUsers] effect fired', {
      isLoaded,
      clerkUserId: clerkUser?.id ?? null,
      isSessionLoaded,
      hasSession: !!session,
      householdId,
    })
    if (!isLoaded || !clerkUser || !isSessionLoaded || !session) {
      console.log('[DEBUG useUsers] bailing early — auth/session not fully ready yet')
      return
    }
    const clerkId = clerkUser.id

    async function load() {
      console.log('[DEBUG useUsers] load() starting, querying users by clerk_id', clerkId)
      // Look up current user by clerk_id
      const { data: me, error: meError } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .maybeSingle()
      console.log('[DEBUG useUsers] initial users lookup result', { me, meError })

      if (!me) {
        // Not onboarded yet — call onboarding route
        console.log('[DEBUG useUsers] no existing user — calling /api/onboarding')
        const onboardRes = await fetch('/api/onboarding', { method: 'POST' })
        console.log('[DEBUG useUsers] /api/onboarding responded', onboardRes.status)
        // Retry after onboarding
        const { data: retried, error: retriedError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkId)
          .maybeSingle()
        console.log('[DEBUG useUsers] retry lookup result', { retried, retriedError })
        if (retried) {
          setCurrentUser(retried)
          setHouseholdId(retried.household_id)
          loadHouseholdUsers(retried.household_id)
        }
      } else {
        setCurrentUser(me)
        setHouseholdId(me.household_id)
        loadHouseholdUsers(me.household_id)
      }

      setLoading(false)
    }

    async function loadHouseholdUsers(hId: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('household_id', hId)
      console.log('[DEBUG useUsers] loadHouseholdUsers result', { data, error })
      if (data) setUsers(data)
    }

    load()
  }, [isLoaded, clerkUser, isSessionLoaded, session, supabase])

  function getUser(id: string) {
    return users.find(u => u.id === id) ?? null
  }

  function getUserName(id: string): string {
    return getUser(id)?.name ?? 'Unknown'
  }

  function isCurrentUser(id: string): boolean {
    return id === currentUser?.id
  }

  return {
    users,
    currentUser,
    currentUserId: currentUser?.id ?? null,
    clerkId: clerkUser?.id ?? null,
    householdId,
    loading,
    getUser,
    getUserName,
    isCurrentUser
  }
}
