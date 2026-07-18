import { useUser, useSession } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'
import { getSessionUserId } from '@/lib/session'
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

// ─── Identity cache ─────────────────────────────────────────────────────────
//
// Who the signed-in user is (their Supabase row + household member list) is
// effectively static — it only changes on rename, avatar change, or household
// membership changes, all rare. Without a cache, every reload re-derives it
// from the network before anything else can load, and that lookup sits at the
// head of a fully sequential chain (Clerk client → token → users lookup →
// household users → only then board data), so it directly delays first paint
// of real data. Seed state from this cache synchronously, let consumers
// proceed immediately, and re-verify against Supabase in the background —
// updating state (and the cache) only if something actually changed.
//
// Keyed by clerk id so switching accounts can never serve another user's
// identity. Stale entries self-heal on the next background verify.

const IDENTITY_CACHE_PREFIX = 'mypayboard-identity-'

type CachedIdentity = { me: SupabaseUser; users: SupabaseUser[] }

function readIdentityCache(clerkId: string): CachedIdentity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${IDENTITY_CACHE_PREFIX}${clerkId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedIdentity
    if (!parsed?.me?.id || !parsed.me.household_id || !Array.isArray(parsed.users)) return null
    return parsed
  } catch {
    return null
  }
}

function writeIdentityCache(clerkId: string, identity: CachedIdentity): void {
  try {
    localStorage.setItem(`${IDENTITY_CACHE_PREFIX}${clerkId}`, JSON.stringify(identity))
  } catch {
    // Best-effort — a missed write just means the next reload resolves
    // identity over the network again.
  }
}

export function useUsers() {
  const { user: clerkUser, isLoaded } = useUser()
  const { session, isLoaded: isSessionLoaded } = useSession()
  const supabase = useSupabaseClient()
  // Seed synchronously from the identity cache when possible — getSessionUserId
  // (localStorage) is available before Clerk hydrates, so a returning user's
  // identity is ready on the very first render and downstream data fetches
  // don't have to wait for the users lookup round trip.
  const [seeded] = useState<CachedIdentity | null>(() => {
    const sessionUserId = getSessionUserId()
    return sessionUserId ? readIdentityCache(sessionUserId) : null
  })
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(seeded?.me ?? null)
  const [users, setUsers] = useState<SupabaseUser[]>(seeded?.users ?? [])
  const [householdId, setHouseholdId] = useState<string | null>(seeded?.me.household_id ?? null)
  const [verifyLoading, setVerifyLoading] = useState(!seeded)

  const clerkUserId = clerkUser?.id ?? null
  const sessionId = session?.id ?? null
  // Cache seeds householdId for display, but consumers gate on `loading` — keep
  // it true until Clerk's client session is ready so Supabase JWTs exist before
  // the once-per-household board fetch fires (prod hydration race).
  const loading = !isSessionLoaded || !sessionId || verifyLoading

  useEffect(() => {
    if (!isLoaded || !clerkUserId || !isSessionLoaded || !sessionId) return
    const clerkId = clerkUserId
    let cancelled = false

    async function loadHouseholdUsers(hId: string): Promise<SupabaseUser[] | null> {
      const { data, error } = await supabase.from('users').select('*').eq('household_id', hId)
      if (error) {
        console.warn('MyPayBoard: failed to load household users:', error.message)
        return null
      }
      if (!cancelled && data) setUsers(data)
      return data ?? null
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
      // Cache hit for this exact Clerk identity: consumers were already
      // unblocked at mount with the cached values — this pass only verifies
      // against Supabase in the background and corrects state if anything
      // (name, avatar, membership) actually changed. No setLoading(true):
      // flipping it back would re-block every consumer for a verification
      // that overwhelmingly confirms what we already have.
      const verifyingFromCache = seeded !== null && seeded.me.clerk_id === clerkId

      if (!verifyingFromCache) setVerifyLoading(true)

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
        const householdUsers = await loadHouseholdUsers(me.household_id)
        if (!cancelled && householdUsers) {
          writeIdentityCache(clerkId, { me, users: householdUsers })
        }
      } else {
        console.error(
          'MyPayBoard: could not resolve Supabase user after retries. Check Clerk JWT template "supabase" and Supabase third-party auth.'
        )
      }

      if (!cancelled) setVerifyLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isLoaded, clerkUserId, isSessionLoaded, sessionId, supabase, seeded])

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
