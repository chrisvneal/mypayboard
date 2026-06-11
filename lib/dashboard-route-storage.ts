import { DASHBOARD_NAV_ITEMS, DASHBOARD_PATHS } from './dashboard-pages'
import { patchUserPrefs, readUserPrefs } from './userPrefs'
import { getSessionUserId } from './session'
import { errorMessage } from './utils'

export const DEFAULT_DASHBOARD_PATH = DASHBOARD_PATHS.home
export const BILLS_AND_INCOME_PATH = DASHBOARD_PATHS.billsAndIncome

/** Old URLs and localStorage values → current dashboard paths */
const LEGACY_DASHBOARD_PATHS: Record<string, string> = {
  '/dashboard/master-list': BILLS_AND_INCOME_PATH,
  '/dashboard/expenses-and-income': BILLS_AND_INCOME_PATH,
  '/dashboard/templates': DASHBOARD_PATHS.settingsTemplates,
  '/dashboard/debt-overview': DASHBOARD_PATHS.debtTracker,
}

const RESTORABLE_DASHBOARD_PATHS = new Set([
  ...DASHBOARD_NAV_ITEMS.map(item => item.href),
  DASHBOARD_PATHS.settingsTemplates,
])

function normalizeDashboardPath(path: string | null | undefined): string | null {
  if (typeof path !== 'string') return null
  if (RESTORABLE_DASHBOARD_PATHS.has(path)) return path
  return LEGACY_DASHBOARD_PATHS[path] ?? null
}

export function isRestorableDashboardPath(path: string | null | undefined): path is string {
  return normalizeDashboardPath(path) !== null
}

export function readLastDashboardPath(userId: string | null = getSessionUserId()) {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PATH

  try {
    const storedPath = readUserPrefs(userId).lastDashboardPath
    return normalizeDashboardPath(storedPath) ?? DEFAULT_DASHBOARD_PATH
  } catch (error) {
    console.warn('MyPayBoard: failed to read last dashboard path:', errorMessage(error))
    return DEFAULT_DASHBOARD_PATH
  }
}

export function storeLastDashboardPath(path: string, userId: string | null = getSessionUserId()) {
  if (typeof window === 'undefined' || !isRestorableDashboardPath(path) || !userId) return

  try {
    patchUserPrefs(userId, { lastDashboardPath: path })
  } catch (error) {
    console.warn('MyPayBoard: failed to store last dashboard path:', errorMessage(error))
  }
}
