export const DEFAULT_DASHBOARD_PATH = '/dashboard'
export const EXPENSES_AND_INCOME_PATH = '/dashboard/expenses-and-income'

const LAST_DASHBOARD_PATH_KEY = 'mypayboard-last-dashboard-path'

/** Old URLs and localStorage values → current dashboard paths */
const LEGACY_DASHBOARD_PATHS: Record<string, string> = {
  '/dashboard/master-list': EXPENSES_AND_INCOME_PATH,
}

const RESTORABLE_DASHBOARD_PATHS = new Set([
  DEFAULT_DASHBOARD_PATH,
  '/dashboard/templates',
  EXPENSES_AND_INCOME_PATH,
  '/dashboard/debt-overview',
  '/dashboard/archive',
  '/dashboard/settings',
])

function normalizeDashboardPath(path: string | null | undefined): string | null {
  if (typeof path !== 'string') return null
  if (RESTORABLE_DASHBOARD_PATHS.has(path)) return path
  return LEGACY_DASHBOARD_PATHS[path] ?? null
}

export function isRestorableDashboardPath(path: string | null | undefined): path is string {
  return normalizeDashboardPath(path) !== null
}

export function readLastDashboardPath() {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PATH

  try {
    const storedPath = localStorage.getItem(LAST_DASHBOARD_PATH_KEY)
    return normalizeDashboardPath(storedPath) ?? DEFAULT_DASHBOARD_PATH
  } catch {
    return DEFAULT_DASHBOARD_PATH
  }
}

export function storeLastDashboardPath(path: string) {
  if (typeof window === 'undefined' || !isRestorableDashboardPath(path)) return

  try {
    localStorage.setItem(LAST_DASHBOARD_PATH_KEY, path)
  } catch {
    // Route memory is a convenience only; navigation should keep working without it.
  }
}
