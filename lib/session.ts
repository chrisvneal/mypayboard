/**
 * Browser session identity — who is signed in on *this* device/tab.
 *
 * The Clerk user ID is the sole identity source. `syncFromClerk` writes it to
 * `mypayboard-user` so downstream hooks (`useMyPayBoard`, `useUserPrefs`) can
 * read `getSessionUserId()` synchronously without waiting for Clerk to resolve.
 *
 * Key: `mypayboard-user`
 */

import type { User } from './types'
import { errorMessage } from './utils'

export const SESSION_USER_KEY = 'mypayboard-user'

type StoredSessionUser = Pick<User, 'id'>

function safeParse(raw: string | null): StoredSessionUser | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSessionUser>
    return typeof parsed.id === 'string' ? { id: parsed.id } : null
  } catch (error) {
    console.warn(
      'MyPayBoard: corrupt session data, treating as logged out:',
      errorMessage(error)
    )
    return null
  }
}

/** Id of the user signed in on this browser, or null when logged out. */
export function getSessionUserId(): string | null {
  if (typeof window === 'undefined') return null
  return safeParse(localStorage.getItem(SESSION_USER_KEY))?.id ?? null
}

/** Full user record for the active session. Returns null until Clerk resolves auth on mount. */
export function getSessionUser(): User | null {
  return null
}

export function clearSessionUser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_USER_KEY)
  } catch (error) {
    console.warn('MyPayBoard: failed to clear session:', errorMessage(error))
  }
}

/**
 * Called once per mount in DashboardShell after the server confirms auth.
 * Writes the Clerk user ID to `mypayboard-user` so getSessionUserId() returns
 * the correct value when useUserPrefs / useMyPayBoard capture it synchronously.
 *
 * Pass null to clear the session (e.g. on sign-out).
 */
export function syncFromClerk(clerkUserId: string | null): { id: string } | null {
  if (typeof window === 'undefined') return null
  if (!clerkUserId) {
    localStorage.removeItem(SESSION_USER_KEY)
    return null
  }
  const session = { id: clerkUserId }
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session))
  return session
}
