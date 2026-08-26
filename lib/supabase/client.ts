'use client'

import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
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
 *
 * De-dupes concurrent callers onto a single in-flight mint: supabase-js calls
 * `accessToken()` separately for every outgoing request, and the dashboard's
 * initial load fires ~10 Supabase requests in the same tick (boards,
 * creditors, incomes, categories, templates, household, users, prefs, ...).
 * Without this, that's ~10 concurrent `session.getToken()` calls for the same
 * template — confirmed via the Network tab to serialize on Clerk's side, with
 * the last-served request landing over a second after the rest. Sharing one
 * in-flight promise collapses those into a single round trip.
 */
let inFlightTokenPromise: Promise<string | null> | null = null

async function getSupabaseAccessToken(session: NonNullable<ClerkSession>): Promise<string | null> {
  if (inFlightTokenPromise) return inFlightTokenPromise

  inFlightTokenPromise = (async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const token = await session.getToken({ template: 'supabase' })
      if (token) return token
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)))
    }
    console.warn(
      'MyPayBoard: Clerk supabase JWT template returned no token. Check that a JWT template named "supabase" exists in the Clerk dashboard.'
    )
    return null
  })()

  try {
    return await inFlightTokenPromise
  } finally {
    inFlightTokenPromise = null
  }
}

export function useSupabaseClient() {
  const { session } = useSession()
  const sessionRef = useRef<ClerkSession>(session)
  // Keep the latest session synchronously — do not wait for useEffect.
  // eslint-disable-next-line react-hooks/refs -- intentional: ref mirror of session for async accessToken
  sessionRef.current = session

  const accessToken = useCallback(async () => {
    // Requests can now legitimately fire before Clerk's client-side session
    // hydrates (identity is cache-seeded in useUsers, so data fetches start
    // immediately on reload). Returning null here would send them out
    // unauthenticated — RLS silently answers with zero rows, and ref-guarded
    // once-per-household fetch effects would never retry. Wait for the
    // session instead: it reliably appears within the first few hundred ms
    // (the user already passed the server-side auth guard to get here).
    for (let attempt = 0; attempt < 50; attempt++) {
      const current = sessionRef.current
      if (current) return getSupabaseAccessToken(current)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    console.warn('MyPayBoard: Clerk session never hydrated — Supabase request going out unauthenticated.')
    return null
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

/**
 * Separate, Realtime-only Supabase client — never used for REST (`.from()`)
 * calls, only for the household-sync channel in useRealtime.ts.
 *
 * Realtime's socket only gets handed a fresh token once per heartbeat
 * (~25s, hardcoded in @supabase/realtime-js), and Clerk's `getToken()` is a
 * cache lookup by default — it can return a token with only a few seconds
 * of remaining TTL rather than a freshly-minted one, since Clerk only mints
 * a new one once the cached one is actually near/past expiry. A token that
 * dies seconds after being handed to the socket, with the next refresh 25s
 * away, produced a connect → briefly SUBSCRIBED → InvalidJWTToken → CLOSED
 * → reconnect loop (confirmed via realtime-js source and the reported error
 * timing — see the Realtime JWT refresh audit). `skipCache: true` forces a
 * genuine server mint on every call, so every heartbeat-triggered refresh
 * gets a token with a full TTL.
 *
 * Deliberately NOT shared with useSupabaseClient()'s accessToken — turning
 * skipCache on there would force a server round trip on every ordinary
 * REST request in the app (the dashboard's initial load alone fires ~10),
 * not just Realtime's one-per-25s refresh. Kept as its own client (plain
 * @supabase/supabase-js, not @supabase/ssr's createBrowserClient, which
 * caches a single shared client instance in the browser and silently
 * ignores new options — including a different accessToken — on any call
 * after the first) so this stays fully isolated from the REST client's
 * caching behavior.
 */
export function useRealtimeSupabaseClient() {
  const { session } = useSession()
  const sessionRef = useRef<ClerkSession>(session)
  // eslint-disable-next-line react-hooks/refs -- ref mirror of session, same pattern as useSupabaseClient above
  sessionRef.current = session

  const accessToken = useCallback(async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const current = sessionRef.current
      if (current) {
        for (let tokenAttempt = 0; tokenAttempt < 10; tokenAttempt++) {
          const token = await current.getToken({ template: 'supabase', skipCache: true })
          if (token) return token
          await new Promise(resolve => setTimeout(resolve, 50 * (tokenAttempt + 1)))
        }
        console.warn(
          'MyPayBoard: Clerk supabase JWT template returned no token for Realtime. Check that a JWT template named "supabase" exists in the Clerk dashboard.'
        )
        return null
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    console.warn('MyPayBoard: Clerk session never hydrated — Realtime channel going out unauthenticated.')
    return null
  }, [])

  return useMemo(() => {
    return createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      // eslint-disable-next-line react-hooks/refs -- see comment above
      { accessToken }
    )
  }, [accessToken])
}
