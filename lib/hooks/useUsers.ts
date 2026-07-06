import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [users, setUsers] = useState<SupabaseUser[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !clerkUser) return
    const clerkId = clerkUser.id

    async function load() {
      const supabase = createClient()

      // Look up current user by clerk_id
      const { data: me } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .single()

      if (!me) {
        // Not onboarded yet — call onboarding route
        await fetch('/api/onboarding', { method: 'POST' })
        // Retry after onboarding
        const { data: retried } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkId)
          .single()
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
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('household_id', hId)
      if (data) setUsers(data)
    }

    load()
  }, [isLoaded, clerkUser])

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
