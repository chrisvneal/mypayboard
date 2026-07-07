import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

/**
 * RLS-scoped server client bound to the current Clerk session. Passes the
 * Clerk session JWT to Supabase via `accessToken` so RLS policies (which
 * filter on `auth.jwt() ->> 'sub'`) can resolve the caller's household.
 * Requires the Clerk <-> Supabase third-party auth integration to be
 * enabled in both dashboards.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies are read-only, safe to ignore
          }
        },
      },
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
