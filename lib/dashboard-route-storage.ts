export const DEFAULT_DASHBOARD_PATH = '/dashboard'

const LAST_DASHBOARD_PATH_KEY = 'mypayboard-last-dashboard-path'
const RESTORABLE_DASHBOARD_PATHS = new Set([
  DEFAULT_DASHBOARD_PATH,
  '/dashboard/templates',
  '/dashboard/master-list',
  '/dashboard/debt-overview',
  '/dashboard/archive',
  '/dashboard/settings',
])

export function isRestorableDashboardPath(path: string | null | undefined): path is string {
  return typeof path === 'string' && RESTORABLE_DASHBOARD_PATHS.has(path)
}

export function readLastDashboardPath() {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PATH

  try {
    const storedPath = localStorage.getItem(LAST_DASHBOARD_PATH_KEY)
    return isRestorableDashboardPath(storedPath) ? storedPath : DEFAULT_DASHBOARD_PATH
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
