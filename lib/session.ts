/**
 * Browser session identity — who is signed in on *this* device/tab.
 *
 * Session is separate from shared household data (`mypayboard-data`). In a
 * typical app each browser keeps its own session; the shared record must never
 * store "who is viewing" (that breaks multi-user / database backends).
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

/** Sign in — persists only the session key, not shared household data. */
export function setSessionUser(user: User): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify({ id: user.id }))
  } catch (error) {
    console.warn('MyPayBoard: failed to save session:', errorMessage(error))
  }
}

export function clearSessionUser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_USER_KEY)
  } catch (error) {
    console.warn('MyPayBoard: failed to clear session:', errorMessage(error))
  }
}

function mapClerkIdToAppUserId(clerkId: string): string | null {
  const chrisId = process.env.NEXT_PUBLIC_CLERK_CHRIS_ID
  const nicoleId = process.env.NEXT_PUBLIC_CLERK_NICOLE_ID
  if (chrisId && clerkId === chrisId) return 'user-1'
  if (nicoleId && clerkId === nicoleId) return 'user-2'
  return null
}

/**
 * Called once in the dashboard layout after Clerk confirms auth.
 * Maps the Clerk user ID → internal app user and writes to mypayboard-user
 * so all existing getSessionUserId() calls get the right value immediately.
 * Falls back to user-1 when env var mapping isn't configured yet.
 */
export function syncFromClerk(clerkId: string): void {
  if (typeof window === 'undefined') return
  const appUserId = mapClerkIdToAppUserId(clerkId) ?? 'user-1'
  setSessionUser({ id: appUserId } as User)
}
