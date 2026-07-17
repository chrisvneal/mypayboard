import { useUser, useSession } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'
import { getUserDisplayName } from '@/lib/user-display-name'

type SupabaseUser = {
  id: string
  household_id: string
  clerk_id: string
  name: string
  display_name: string | null
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
    let cancelled = false

    async function loadHouseholdUsers(hId: string) {
      const { data, error } = await supabase.from('users').select('*').eq('household_id', hId)
      if (error) {
        console.warn('MyPayBoard: failed to load household users:', error.message)
        return
      }
      if (!cancelled && data) setUsers(data)
    }

    async function resolveCurrentUser(): Promise<SupabaseUser | null> {
      // Right after OAuth, the first Supabase call can 401 before the Clerk
      // supabase JWT is mintable. Retry briefly instead of leaving the
      // dashboard stuck on "Loading boards…" until a hard refresh.
      for (let attempt = 0; attempt < 8; attempt++) {
        if (cancelled) return null

        const { data: me, error: meError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkId)
          .maybeSingle()

        if (!meError) return me

        console.warn(
          `MyPayBoard: users lookup failed (attempt ${attempt + 1}/8):`,
          meError.message
        )
        await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)))
      }
      return null
    }

    async function load() {
      setLoading(true)

      let me = await resolveCurrentUser()
      if (cancelled) return

      if (!me) {
        // Not onboarded yet — or lookups kept failing. Try onboarding, then
        // one more resolve pass.
        await fetch('/api/onboarding', { method: 'POST' })
        if (cancelled) return
        me = await resolveCurrentUser()
        if (cancelled) return
      }

      if (me) {
        setCurrentUser(me)
        setHouseholdId(me.household_id)
        // Must be awaited — consumers (useMyPayBoard's initial Supabase
        // fetch) gate on `loading` to know when `users` is safe to read.
        // Firing this without awaiting let `loading` flip to false (and
        // householdId resolve) one render before `users` actually
        // populated, so every owner/author lookup done in that window
        // silently resolved to nothing.
        await loadHouseholdUsers(me.household_id)
      } else {
        console.error(
          'MyPayBoard: could not resolve Supabase user after retries. Check Clerk JWT template "supabase" and Supabase third-party auth.'
        )
      }

      if (!cancelled) setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isLoaded, clerkUserId, isSessionLoaded, sessionId, supabase])

  function getUser(id: string) {
    return users.find(u => u.id === id) ?? null
  }

  function getUserName(id: string): string {
    const user = getUser(id)
    if (!user) return 'Unknown'
    return getUserDisplayName({ name: user.name, displayName: user.display_name ?? undefined })
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
    isCurrentUser,
  }
}
