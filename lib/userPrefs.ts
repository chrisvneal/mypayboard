'use client'

import { useCallback, useState } from 'react'
import type { PayDateModule } from './types'

// ─── Per-user UI preferences ────────────────────────────────────────────────
//
// MyPayBoard separates localStorage into two buckets:
//
//   • Shared state  → `mypayboard-data`         (boards, bills, notes, income)
//   • Personal state → `mypayboard-prefs-{userId}` (theme, view mode, collapsed
//                                                    groups — this file)
//
// Both users always see the same financial data, but each keeps their own
// layout/appearance preferences. Only the storage key for UI preferences
// changes here — no financial data moves.

export type ThemePref = 'light' | 'dark'
export type ColumnView = 'grouped' | 'list'
export type GroupOpenState = Record<string, boolean>

export type UserPrefs = {
  /** null = no explicit choice yet (treated as light). */
  theme: ThemePref | null
  expenseView: ColumnView
  incomeView: ColumnView
  expenseGroupOpenState: GroupOpenState
  incomeGroupOpenState: GroupOpenState
  /**
   * Personal header color choices for pay-date modules, keyed so the choice
   * carries forward month to month (see `moduleColorKey`). Each user overrides
   * their own view; absent an override, the shared module/owner default shows.
   */
  moduleHeaderColors: Record<string, string>
}

export const DEFAULT_USER_PREFS: UserPrefs = {
  theme: null,
  expenseView: 'grouped',
  incomeView: 'grouped',
  expenseGroupOpenState: {},
  incomeGroupOpenState: {},
  moduleHeaderColors: {},
}

/**
 * Stable key for a module's personal header color. Template-derived modules
 * reuse their `templateModuleId` (which is constant across regenerated months),
 * so a color choice persists into future months. One-off / duplicated modules
 * fall back to their per-board id.
 */
export function moduleColorKey(
  module: Pick<PayDateModule, 'id' | 'owner' | 'templateModuleId'>
): string {
  return `${module.owner}:${module.templateModuleId ?? module.id}`
}

const PREFS_KEY_PREFIX = 'mypayboard-prefs-'
const SESSION_USER_KEY = 'mypayboard-user'

// Legacy global keys from before per-user separation. They were shared across
// users; we read them once to seed a user's prefs, after which the consolidated
// per-user key takes over. The legacy values are left in place (harmless).
const LEGACY_THEME_KEY = 'mypayboard-theme'
const LEGACY_EXPENSE_VIEW_KEY = 'mypayboard-expense-view-state'
const LEGACY_INCOME_VIEW_KEY = 'mypayboard-income-view-state'
const LEGACY_EXPENSE_GROUPS_KEY = 'mypayboard-expense-group-open-state'
const LEGACY_INCOME_GROUPS_KEY = 'mypayboard-income-group-open-state'

function prefsKey(userId: string | null): string | null {
  return userId ? `${PREFS_KEY_PREFIX}${userId}` : null
}

export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed.id ?? null
  } catch {
    return null
  }
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

function safeParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Build prefs from the legacy shared keys, falling back to defaults. */
function readLegacyPrefs(): UserPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_USER_PREFS }
  return {
    theme: coerceTheme(localStorage.getItem(LEGACY_THEME_KEY)),
    expenseView: coerceView(localStorage.getItem(LEGACY_EXPENSE_VIEW_KEY)) ?? DEFAULT_USER_PREFS.expenseView,
    incomeView: coerceView(localStorage.getItem(LEGACY_INCOME_VIEW_KEY)) ?? DEFAULT_USER_PREFS.incomeView,
    expenseGroupOpenState: coerceGroupOpenState(safeParse(localStorage.getItem(LEGACY_EXPENSE_GROUPS_KEY))),
    incomeGroupOpenState: coerceGroupOpenState(safeParse(localStorage.getItem(LEGACY_INCOME_GROUPS_KEY))),
    // Header colors were shared board data before this change; there is no
    // legacy personal source, so users start from the shared/owner default.
    moduleHeaderColors: {},
  }
}

export function readUserPrefs(userId: string | null): UserPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_USER_PREFS }
  const key = prefsKey(userId)
  if (key) {
    const parsed = safeParse(localStorage.getItem(key)) as Partial<UserPrefs> | null
    if (parsed && typeof parsed === 'object') {
      return {
        theme: coerceTheme(parsed.theme),
        expenseView: coerceView(parsed.expenseView) ?? DEFAULT_USER_PREFS.expenseView,
        incomeView: coerceView(parsed.incomeView) ?? DEFAULT_USER_PREFS.incomeView,
        expenseGroupOpenState: coerceGroupOpenState(parsed.expenseGroupOpenState),
        incomeGroupOpenState: coerceGroupOpenState(parsed.incomeGroupOpenState),
        moduleHeaderColors: coerceStringRecord(parsed.moduleHeaderColors),
      }
    }
  }
  // No per-user prefs stored yet → seed from legacy shared keys (or defaults).
  return readLegacyPrefs()
}

export function writeUserPrefs(userId: string | null, prefs: UserPrefs): void {
  if (typeof window === 'undefined') return
  const key = prefsKey(userId)
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(prefs))
  } catch {
    // UI preference only; never block interaction.
  }
}

/** Read-modify-write a subset of prefs so concurrent writers don't clobber. */
export function patchUserPrefs(userId: string | null, partial: Partial<UserPrefs>): void {
  if (typeof window === 'undefined') return
  if (!prefsKey(userId)) return
  writeUserPrefs(userId, { ...readUserPrefs(userId), ...partial })
}

export function readUserTheme(): ThemePref | null {
  return readUserPrefs(getCurrentUserId()).theme
}

export function writeUserTheme(theme: ThemePref): void {
  patchUserPrefs(getCurrentUserId(), { theme })
}

type PrefsPatch = Partial<UserPrefs> | ((prev: UserPrefs) => Partial<UserPrefs>)

/**
 * React hook for the current user's UI preferences. Reads synchronously on the
 * client (so the correct view/collapsed state renders without a flash) and
 * persists each change as a merge into the latest stored prefs.
 */
export function useUserPrefs() {
  const [userId] = useState<string | null>(() => getCurrentUserId())
  const [prefs, setPrefs] = useState<UserPrefs>(() => readUserPrefs(userId))

  const patch = useCallback(
    (next: PrefsPatch) => {
      setPrefs(prev => {
        const partial = typeof next === 'function' ? next(prev) : next
        patchUserPrefs(userId, partial)
        return { ...prev, ...partial }
      })
    },
    [userId]
  )

  return { prefs, patch }
}
