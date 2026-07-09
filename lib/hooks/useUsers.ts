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

  const clerkUserId = clerkUser?.id ?? null
  const sessionId = session?.id ?? null

  useEffect(() => {
    if (!isLoaded || !clerkUserId || !isSessionLoaded || !sessionId) return
    const clerkId = clerkUserId

    async function load() {
      // Look up current user by clerk_id
      const { data: me } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .maybeSingle()

      if (!me) {
        // Not onboarded yet — call onboarding route
        await fetch('/api/onboarding', { method: 'POST' })
        // Retry after onboarding
        const { data: retried } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkId)
          .maybeSingle()
        if (retried) {
          setCurrentUser(retried)
          setHouseholdId(retried.household_id)
          // Must be awaited — consumers (useMyPayBoard's initial Supabase
          // fetch) gate on `loading` to know when `users` is safe to read.
          // Firing this without awaiting let `loading` flip to false (and
          // householdId resolve) one render before `users` actually
          // populated, so every owner/author lookup done in that window
          // silently resolved to nothing.
          await loadHouseholdUsers(retried.household_id)
        }
      } else {
        setCurrentUser(me)
        setHouseholdId(me.household_id)
        await loadHouseholdUsers(me.household_id)
      }

      setLoading(false)
    }

    async function loadHouseholdUsers(hId: string) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('household_id', hId)
      if (data) setUsers(data)
    }

    load()
  }, [isLoaded, clerkUserId, isSessionLoaded, sessionId, supabase])

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
