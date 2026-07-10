'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { coerceReadNoteIds } from './note-read-state'
import type { PayDateCard } from './types'
import { getSessionUserId } from './session'
import { useUsers } from './hooks/useUsers'
import { useSupabaseData } from './hooks/useSupabaseData'
import { debounceWrite } from './supabase/debounce-write'
import { fireSync } from './supabase/fire-sync'

// ─── Per-user UI preferences ────────────────────────────────────────────────
//
// Personal UI prefs (this file) live in Supabase's `user_prefs` table,
// keyed by the Supabase user id. Session identity (`mypayboard-user`, see
// session.ts) is a separate, synchronous localStorage cache of "who's
// signed in" — kept as-is; it's what lets this file's exported functions
// resolve a userId (via getSessionUserId()) without waiting on React.
//
// The in-memory cache below is keyed by that same session/Clerk id (not the
// Supabase user id), since that's the identity synchronously available
// everywhere these functions are called from — the Supabase writes inside
// useUserPrefs()/markNotesRead resolve the real Supabase user id separately
// at write time.

export type ThemePref = 'light' | 'dark'
export type ColumnView = 'grouped' | 'list'
export type GroupOpenState = Record<string, boolean>

/** Which optional columns/icons show on the expenses list (per user). */
export type ExpenseDisplayPrefs = {
  accountNumber: boolean
  dueDate: boolean
  linkIcon: boolean
}

export const DEFAULT_EXPENSE_DISPLAY_PREFS: ExpenseDisplayPrefs = {
  accountNumber: true,
  dueDate: true,
  linkIcon: true,
}

export type ModuleSortEntry = { key: 'name' | 'amount' | 'dueDate'; direction: 'asc' | 'desc' }

export type UserPrefs = {
  /** null = no explicit choice yet (treated as light). */
  theme: ThemePref | null
  expenseView: ColumnView
  incomeView: ColumnView
  expenseGroupOpenState: GroupOpenState
  incomeGroupOpenState: GroupOpenState
  expenseDisplayPrefs: ExpenseDisplayPrefs
  /**
   * Personal header color choices for pay-date cards, keyed so the choice
   * carries forward month to month (see `moduleColorKey`). Each user overrides
   * their own view; absent an override, the shared card/owner default shows.
   */
  moduleHeaderColors: Record<string, string>
  /** Note ids this user has read — unread state is per viewer, not shared household data. */
  readNoteIds: string[]
  moduleSortState: Record<string, ModuleSortEntry>
  /** Last dashboard route this user visited (post-login redirect). */
  lastDashboardPath: string | null
}

export const DEFAULT_USER_PREFS: UserPrefs = {
  theme: null,
  expenseView: 'grouped',
  incomeView: 'grouped',
  expenseGroupOpenState: {},
  incomeGroupOpenState: {},
  expenseDisplayPrefs: DEFAULT_EXPENSE_DISPLAY_PREFS,
  moduleHeaderColors: {},
  readNoteIds: [],
  moduleSortState: {},
  lastDashboardPath: null,
}

/**
 * Stable key for a card's personal header color. Template-derived cards
 * reuse their `templatePayDateCardId` (which is constant across regenerated months),
 * so a color choice persists into future months. One-off / duplicated cards
 * fall back to their per-board id.
 */
export function moduleColorKey(
  card: Pick<PayDateCard, 'id' | 'owner' | 'templatePayDateCardId'>
): string {
  return `${card.owner}:${card.templatePayDateCardId ?? card.id}`
}

/** @deprecated Use getSessionUserId from `@/lib/session` */
export function getCurrentUserId(): string | null {
  return getSessionUserId()
}

function coerceTheme(value: unknown): ThemePref | null {
  return value === 'light' || value === 'dark' ? value : null
}

function coerceView(value: unknown): ColumnView | null {
  return value === 'list' || value === 'grouped' ? value : null
}

function coerceGroupOpenState(value: unknown): GroupOpenState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
  )
}

function coerceStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

function coerceExpenseDisplayPrefs(value: unknown): ExpenseDisplayPrefs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_EXPENSE_DISPLAY_PREFS
  }
  const raw = value as Partial<ExpenseDisplayPrefs>
  return {
    accountNumber:
      typeof raw.accountNumber === 'boolean'
        ? raw.accountNumber
        : DEFAULT_EXPENSE_DISPLAY_PREFS.accountNumber,
    dueDate:
      typeof raw.dueDate === 'boolean' ? raw.dueDate : DEFAULT_EXPENSE_DISPLAY_PREFS.dueDate,
    linkIcon:
      typeof raw.linkIcon === 'boolean' ? raw.linkIcon : DEFAULT_EXPENSE_DISPLAY_PREFS.linkIcon,
  }
}

function coerceModuleSortState(value: unknown): Record<string, ModuleSortEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, ModuleSortEntry> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    const { key, direction } = v as Record<string, unknown>
    if (
      (key === 'name' || key === 'amount' || key === 'dueDate') &&
      (direction === 'asc' || direction === 'desc')
    ) {
      result[k] = { key, direction }
    }
  }
  return result
}

/** Shared validation for a prefs blob from any source (Supabase jsonb). */
export function coerceUserPrefs(parsed: unknown): UserPrefs | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Partial<UserPrefs>
  return {
    theme: coerceTheme(p.theme),
    expenseView: coerceView(p.expenseView) ?? DEFAULT_USER_PREFS.expenseView,
    incomeView: coerceView(p.incomeView) ?? DEFAULT_USER_PREFS.incomeView,
    expenseGroupOpenState: coerceGroupOpenState(p.expenseGroupOpenState),
    incomeGroupOpenState: coerceGroupOpenState(p.incomeGroupOpenState),
    expenseDisplayPrefs: coerceExpenseDisplayPrefs(p.expenseDisplayPrefs),
    moduleHeaderColors: coerceStringRecord(p.moduleHeaderColors),
    readNoteIds: coerceReadNoteIds(p.readNoteIds),
    moduleSortState: coerceModuleSortState(p.moduleSortState),
    lastDashboardPath: typeof p.lastDashboardPath === 'string' ? p.lastDashboardPath : null,
  }
}

// In-memory cache — replaces localStorage as the synchronous "current
// prefs" read source. Populated once useUserPrefs's Supabase fetch
// resolves; lost on reload by design (Supabase is the durable store now).
// Keyed by session/Clerk id — see file header comment for why.
let cachedUserId: string | null = null
let cachedPrefs: UserPrefs = DEFAULT_USER_PREFS

export function readUserPrefs(userId: string | null): UserPrefs {
  return userId && userId === cachedUserId ? cachedPrefs : DEFAULT_USER_PREFS
}

export function writeUserPrefs(userId: string | null, prefs: UserPrefs): void {
  if (!userId) return
  cachedUserId = userId
  cachedPrefs = prefs
}

/**
 * Narrow, dedicated localStorage cache of JUST the theme value — not the
 * prefs source of truth (Supabase is), this exists purely so the
 * pre-hydration anti-flash script (theme-init-script.ts, runs before React
 * or any network request) can synchronously paint the right theme class on
 * <html> before first paint. Keyed by Clerk id, matching mypayboard-user
 * (session.ts), the other thing that script reads synchronously.
 */
const THEME_CACHE_KEY_PREFIX = 'mypayboard-theme-cache-'

function writeThemeCache(clerkUserId: string | null, theme: ThemePref | null): void {
  if (typeof window === 'undefined' || !clerkUserId) return
  try {
    if (theme) {
      localStorage.setItem(`${THEME_CACHE_KEY_PREFIX}${clerkUserId}`, theme)
    } else {
      localStorage.removeItem(`${THEME_CACHE_KEY_PREFIX}${clerkUserId}`)
    }
  } catch {
    // Best-effort only — a missed cache write just means one extra reload
    // before the anti-flash script has a value, not a data-loss risk.
  }
}

/** Mark notes as read for the current viewer — stored per user, not in household data. */
export function markNotesAsRead(userId: string | null, noteIds: string[]): void {
  if (!userId || noteIds.length === 0) return
  const current = readUserPrefs(userId)
  const next = [...new Set([...current.readNoteIds, ...noteIds])]
  if (next.length === current.readNoteIds.length) return
  writeUserPrefs(userId, { ...current, readNoteIds: next })
  notifyPrefsChanged()
}

/** Read-modify-write a subset of prefs so concurrent writers don't clobber. */
export function patchUserPrefs(userId: string | null, partial: Partial<UserPrefs>): void {
  if (!userId) return
  writeUserPrefs(userId, { ...readUserPrefs(userId), ...partial })
}

export function readUserTheme(): ThemePref | null {
  return readUserPrefs(getSessionUserId()).theme
}

export function writeUserTheme(theme: ThemePref): void {
  const userId = getSessionUserId()
  patchUserPrefs(userId, { theme })
  writeThemeCache(userId, theme)
}

type PrefsPatch = Partial<UserPrefs> | ((prev: UserPrefs) => Partial<UserPrefs>)

// Cross-component sync: every mounted `useUserPrefs` registers here so a patch
// from one component (e.g. a column's view toggle) re-syncs the others (e.g. the
// page reading both views to choose its layout). The in-memory cache above is
// the source of truth; listeners simply re-read after each write.
const prefsListeners = new Set<() => void>()

function notifyPrefsChanged(): void {
  prefsListeners.forEach(listener => listener())
}

/**
 * React hook for the current user's UI preferences. Prefs live in Supabase;
 * this hook seeds from the in-memory cache (empty/default until the first
 * Supabase fetch resolves, same as useMyPayBoard's data model) and persists
 * each change as a merge into the latest cached prefs. All hook instances
 * stay in sync via a shared listener registry.
 */
export function useUserPrefs() {
  const [userId] = useState<string | null>(() => getSessionUserId())
  const [prefs, setPrefs] = useState<UserPrefs>(() => readUserPrefs(userId))
  const { currentUserId: supabaseUserId, householdId } = useUsers()
  const supa = useSupabaseData()
  const appliedUserRef = useRef<string | null>(null)

  // supabaseUserId/householdId resolve asynchronously (Clerk session ->
  // Supabase users lookup) — a patch() called before that finishes would
  // otherwise be silently dropped by the `if (supabaseUserId && householdId)`
  // check below. Hold at most one pending sync (the latest always
  // supersedes earlier ones, since each patch's `merged` already reflects
  // every prior local change) and flush it once both resolve.
  const identityRef = useRef<{ userId: string; householdId: string } | null>(null)
  useEffect(() => {
    identityRef.current = supabaseUserId && householdId ? { userId: supabaseUserId, householdId } : null
  }, [supabaseUserId, householdId])
  const pendingPrefsSyncRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!identityRef.current || !pendingPrefsSyncRef.current) return
    const fn = pendingPrefsSyncRef.current
    pendingPrefsSyncRef.current = null
    fn()
  }, [supabaseUserId, householdId])

  useEffect(() => {
    const sync = () => setPrefs(readUserPrefs(userId))
    prefsListeners.add(sync)
    return () => {
      prefsListeners.delete(sync)
    }
  }, [userId])

  // Fetch prefs from Supabase once the Supabase user resolves. The
  // onboarding flow (lib/onboarding.ts) seeds a placeholder row with a
  // different shape ({ theme: 'daylight', has_seen_onboarding }) — trusting
  // "a row exists" the way other domains do would clobber real prefs with
  // that placeholder on every user's first sync. Detect it via its
  // distinguishing key and push the current (default, on first-ever load)
  // prefs up as the real baseline instead.
  useEffect(() => {
    if (!supabaseUserId || !householdId || appliedUserRef.current === supabaseUserId) return
    appliedUserRef.current = supabaseUserId
    ;(async () => {
      const { data } = await supa.list('user_prefs', householdId)
      const mine = (data ?? []).find(
        (row: { user_id: string }) => row.user_id === supabaseUserId
      ) as { prefs: unknown } | undefined
      const rawPrefs = mine?.prefs as Record<string, unknown> | undefined
      const isOnboardingPlaceholder = !!rawPrefs && 'has_seen_onboarding' in rawPrefs
      if (rawPrefs && !isOnboardingPlaceholder) {
        const coerced = coerceUserPrefs(rawPrefs)
        if (coerced) {
          setPrefs(coerced)
          writeUserPrefs(userId, coerced)
          writeThemeCache(userId, coerced.theme)
          return
        }
      }
      const current = readUserPrefs(userId)
      fireSync(
        supa.upsert(
          'user_prefs',
          { user_id: supabaseUserId, household_id: householdId, prefs: current },
          'user_id'
        ),
        'useUserPrefs:seed'
      )
    })()
  }, [supabaseUserId, householdId, supa, userId])

  const patch = useCallback(
    (next: PrefsPatch) => {
      const current = readUserPrefs(userId)
      const partial = typeof next === 'function' ? next(current) : next
      const merged = { ...current, ...partial }
      writeUserPrefs(userId, merged)
      if ('theme' in partial) writeThemeCache(userId, merged.theme)
      notifyPrefsChanged()

      const sync = () => {
        const identity = identityRef.current
        if (!identity) return
        debounceWrite(`user_prefs:${identity.userId}`, () => {
          fireSync(
            supa.upsert(
              'user_prefs',
              { user_id: identity.userId, household_id: identity.householdId, prefs: merged },
              'user_id'
            ),
            'useUserPrefs:patch'
          )
        }, 500)
      }
      if (identityRef.current) {
        sync()
      } else {
        pendingPrefsSyncRef.current = sync
      }
    },
    [userId, supa]
  )

  return { prefs, patch }
}
