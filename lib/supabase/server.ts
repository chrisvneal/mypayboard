import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

/**
 * RLS-scoped server client bound to the current Clerk session. Passes the
 * Clerk session JWT to Supabase via `accessToken` so RLS policies (which
 * filter on `auth.jwt() ->> 'sub'`) can resolve the caller's household.
 * Requires the Clerk <-> Supabase third-party auth integration to be
 * enabled in both dashboards.
 *
 * Uses plain @supabase/supabase-js rather than @supabase/ssr's
 * createServerClient — Clerk owns the session cookie here, not Supabase
 * Auth, so none of ssr's cookie-sync plumbing applies. That distinction
 * isn't cosmetic: createServerClient (@supabase/ssr@0.12.0) unconditionally
 * calls `client.auth.onAuthStateChange(...)` to keep cookies in sync, but
 * supabase-js replaces `client.auth` with a throwing Proxy whenever the
 * `accessToken` option is set (there's no internal session to listen to in
 * that mode) — so createServerClient + accessToken crashes on every call.
 */
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => (await (await auth()).getToken()) ?? null,
    }
  )
}

/**
 * Service-role client that bypasses RLS. Server-only — never expose to the
 * browser. Used for first-login household/user creation in /api/onboarding.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
