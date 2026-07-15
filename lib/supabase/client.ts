'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import { useCallback, useMemo, useRef } from 'react'

type ClerkSession = ReturnType<typeof useSession>['session']

/**
 * Browser Supabase client bound to the current Clerk session. Passes the
 * Clerk session JWT to Supabase via `accessToken` so RLS policies (which
 * filter on `auth.jwt() ->> 'sub'`) can resolve the caller's household.
 * Requires the Clerk <-> Supabase third-party auth integration to be
 * enabled in both dashboards — see docs/supabase session notes.
 *
 * Requests the `supabase` JWT template explicitly (`getToken({ template:
 * 'supabase' })`) rather than the default session token. PostgREST/RLS
 * worked fine either way (it only needs `sub` to resolve the household),
 * but Supabase Realtime hard-requires `role` and `exp` claims on the token
 * or it rejects the subscription with `InvalidJWTToken` — those claims are
 * only present on this named template, not the default session token.
 *
 * `accessToken` reads `session` from a ref rather than closing over it.
 * supabase-js calls `accessToken()` lazily per-request against whichever
 * client instance it already has — it never reconstructs the client for
 * you — so a closure captured at one render (e.g. before Clerk's session
 * resolved) would otherwise stay frozen on a stale/null session forever.
 *
 * The ref is updated during render (safe for refs) so the first request
 * after OAuth redirect never races a useEffect that hasn't run yet — that
 * race caused 401s and a stuck "Loading boards…" until a full page reload.
 *
 * Right after sign-in, `getToken({ template: 'supabase' })` can return null
 * for a beat while Clerk mints the named JWT. We briefly retry so the first
 * dashboard fetch does not go out unauthenticated.
 */
async function getSupabaseAccessToken(session: NonNullable<ClerkSession>): Promise<string | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const token = await session.getToken({ template: 'supabase' })
    if (token) return token
    await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)))
  }
  console.warn(
    'MyPayBoard: Clerk supabase JWT template returned no token. Check that a JWT template named "supabase" exists in the Clerk dashboard.'
  )
  return null
}

export function useSupabaseClient() {
  const { session } = useSession()
  const sessionRef = useRef<ClerkSession>(session)
  // Keep the latest session synchronously — do not wait for useEffect.
  // eslint-disable-next-line react-hooks/refs -- intentional: ref mirror of session for async accessToken
  sessionRef.current = session

  const accessToken = useCallback(async () => {
    const current = sessionRef.current
    if (!current) return null
    return getSupabaseAccessToken(current)
  }, [])

  return useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      // accessToken is only ever invoked asynchronously by supabase-js per outgoing
      // request, never during render — the ref read inside it happens well after
      // commit (see this function's doc comment for why a ref is used at all here).
      // eslint-disable-next-line react-hooks/refs -- see comment above
      { accessToken }
    )
  }, [accessToken])
}
