/**
 * Browser session identity — who is signed in on *this* device/tab.
 *
 * Session is separate from shared household data (`mypayboard-data`). In a
 * typical app each browser keeps its own session; the shared record must never
 * store "who is viewing" (that breaks multi-user / database backends).
 *
 * Key: `mypayboard-user`
 */

import { USERS } from './mockData'
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

/** Full user record for the active session, validated against known users. */
export function getSessionUser(): User | null {
  const id = getSessionUserId()
  if (!id) return null
  return USERS.find(user => user.id === id) ?? null
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
