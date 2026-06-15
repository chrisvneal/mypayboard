'use client'

import { useCallback, useEffect, useState } from 'react'
import { coerceReadNoteIds } from './note-read-state'
import type { PayDateCard } from './types'
import { getSessionUserId } from './session'
import { errorMessage } from './utils'

// ─── Per-user UI preferences ────────────────────────────────────────────────
//
// MyPayBoard separates localStorage into three buckets:
//
//   • Shared household data → `mypayboard-data` (boards, bills, creditors…)
//   • Session identity      → `mypayboard-user`   (who is signed in — see session.ts)
//   • Personal UI prefs     → `mypayboard-prefs-{userId}` (this file)
//
// Both users see the same financial data; each keeps their own layout/appearance.

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

const PREFS_KEY_PREFIX = 'mypayboard-prefs-'

// Legacy global keys from before per-user separation. Read once to seed prefs,
// then removed after the consolidated per-user key is written.
const LEGACY_THEME_KEY = 'mypayboard-theme'
const LEGACY_EXPENSE_VIEW_KEY = 'mypayboard-expense-view-state'
const LEGACY_INCOME_VIEW_KEY = 'mypayboard-income-view-state'
const LEGACY_EXPENSE_GROUPS_KEY = 'mypayboard-expense-group-open-state'
const LEGACY_INCOME_GROUPS_KEY = 'mypayboard-income-group-open-state'
const LEGACY_DISPLAY_PREFS_KEY = 'mypayboard-display-prefs'
const LEGACY_DASHBOARD_PATH_KEY = 'mypayboard-last-dashboard-path'

const LEGACY_PREFS_KEYS = [
  LEGACY_THEME_KEY,
  LEGACY_EXPENSE_VIEW_KEY,
  LEGACY_INCOME_VIEW_KEY,
  LEGACY_EXPENSE_GROUPS_KEY,
  LEGACY_INCOME_GROUPS_KEY,
  LEGACY_DISPLAY_PREFS_KEY,
  LEGACY_DASHBOARD_PATH_KEY,
] as const

function prefsKey(userId: string | null): string | null {
  return userId ? `${PREFS_KEY_PREFIX}${userId}` : null
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

function readLegacyDisplayPrefs(): ExpenseDisplayPrefs {
  if (typeof window === 'undefined') return DEFAULT_EXPENSE_DISPLAY_PREFS
  return coerceExpenseDisplayPrefs(safeParse(localStorage.getItem(LEGACY_DISPLAY_PREFS_KEY)))
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
    expenseDisplayPrefs: readLegacyDisplayPrefs(),
    // Header colors were shared board data before this change; there is no
    // legacy personal source, so users start from the shared/owner default.
    moduleHeaderColors: {},
    readNoteIds: [],
    moduleSortState: {},
    lastDashboardPath:
      typeof window !== 'undefined'
        ? localStorage.getItem(LEGACY_DASHBOARD_PATH_KEY)
        : null,
  }
}

function removeLegacyPrefsKeys(): void {
  if (typeof window === 'undefined') return
  LEGACY_PREFS_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Best-effort cleanup only.
    }
  })
}

export function readUserPrefs(userId: string | null): UserPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_USER_PREFS }
  const key = prefsKey(userId)
  if (key) {
    const raw = localStorage.getItem(key)
    const parsed = safeParse(raw) as Partial<UserPrefs> | null
    if (raw && !parsed) {
      console.warn('MyPayBoard: corrupt user preferences, using defaults')
    }
    if (parsed && typeof parsed === 'object') {
      return {
        theme: coerceTheme(parsed.theme),
        expenseView: coerceView(parsed.expenseView) ?? DEFAULT_USER_PREFS.expenseView,
        incomeView: coerceView(parsed.incomeView) ?? DEFAULT_USER_PREFS.incomeView,
        expenseGroupOpenState: coerceGroupOpenState(parsed.expenseGroupOpenState),
        incomeGroupOpenState: coerceGroupOpenState(parsed.incomeGroupOpenState),
        expenseDisplayPrefs: coerceExpenseDisplayPrefs(parsed.expenseDisplayPrefs),
        moduleHeaderColors: coerceStringRecord(parsed.moduleHeaderColors),
        readNoteIds: coerceReadNoteIds(parsed.readNoteIds),
        moduleSortState: coerceModuleSortState(parsed.moduleSortState),
        lastDashboardPath:
          typeof parsed.lastDashboardPath === 'string' ? parsed.lastDashboardPath : null,
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
    removeLegacyPrefsKeys()
  } catch (error) {
    console.warn('MyPayBoard: failed to save user preferences:', errorMessage(error))
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
  if (typeof window === 'undefined') return
  if (!prefsKey(userId)) return
  writeUserPrefs(userId, { ...readUserPrefs(userId), ...partial })
}

export function readUserTheme(): ThemePref | null {
  return readUserPrefs(getSessionUserId()).theme
}

export function writeUserTheme(theme: ThemePref): void {
  patchUserPrefs(getSessionUserId(), { theme })
}

type PrefsPatch = Partial<UserPrefs> | ((prev: UserPrefs) => Partial<UserPrefs>)

// Cross-component sync: every mounted `useUserPrefs` registers here so a patch
// from one component (e.g. a column's view toggle) re-syncs the others (e.g. the
// page reading both views to choose its layout). localStorage is the source of
// truth; listeners simply re-read after each write.
const prefsListeners = new Set<() => void>()

function notifyPrefsChanged(): void {
  prefsListeners.forEach(listener => listener())
}

/**
 * React hook for the current user's UI preferences. Reads synchronously on the
 * client (so the correct view/collapsed state renders without a flash) and
 * persists each change as a merge into the latest stored prefs. All hook
 * instances stay in sync via a shared listener registry.
 */
export function useUserPrefs() {
  const [userId] = useState<string | null>(() => getSessionUserId())
  const [prefs, setPrefs] = useState<UserPrefs>(() => readUserPrefs(userId))

  useEffect(() => {
    const sync = () => setPrefs(readUserPrefs(userId))
    prefsListeners.add(sync)
    return () => {
      prefsListeners.delete(sync)
    }
  }, [userId])

  const patch = useCallback(
    (next: PrefsPatch) => {
      const current = readUserPrefs(userId)
      const partial = typeof next === 'function' ? next(current) : next
      patchUserPrefs(userId, partial)
      notifyPrefsChanged()
    },
    [userId]
  )

  return { prefs, patch }
}
