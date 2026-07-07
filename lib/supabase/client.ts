'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useSession } from '@clerk/nextjs'
import { useCallback, useEffect, useMemo, useRef } from 'react'

type ClerkSession = ReturnType<typeof useSession>['session']

/**
 * Browser Supabase client bound to the current Clerk session. Passes the
 * Clerk session JWT to Supabase via `accessToken` so RLS policies (which
 * filter on `auth.jwt() ->> 'sub'`) can resolve the caller's household.
 * Requires the Clerk <-> Supabase third-party auth integration to be
 * enabled in both dashboards — see docs/supabase session notes.
 *
 * `accessToken` reads `session` from a ref (kept fresh via an effect,
 * never mutated during render) rather than closing over it directly.
 * supabase-js calls `accessToken()` lazily per-request against whichever
 * client instance it already has — it never reconstructs the client for
 * you — so a closure captured at one render (e.g. before Clerk's session
 * resolved) would otherwise stay frozen on a stale/null session forever.
 * The ref sidesteps that: the client is built once and accessToken always
 * reads the latest session at call time.
 */
export function useSupabaseClient() {
  const { session } = useSession()
  const sessionRef = useRef<ClerkSession>(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const accessToken = useCallback(async () => {
    return (await sessionRef.current?.getToken()) ?? null
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
