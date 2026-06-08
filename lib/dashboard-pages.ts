export type DashboardPageRole = 'operational' | 'defaults' | 'reporting' | 'system'

export type DashboardNavItem = {
  href: string
  label: string
  title: string
  role: DashboardPageRole
}

export const DASHBOARD_PATHS = {
  home: '/dashboard',
  /** @deprecated Use settingsTemplates */
  templates: '/dashboard/templates',
  settingsTemplates: '/dashboard/settings/templates',
  expensesAndIncome: '/dashboard/expenses-and-income',
  debtOverview: '/dashboard/debt-overview',
  archive: '/dashboard/archive',
  settings: '/dashboard/settings',
} as const

export const DASHBOARD_NAV_ITEMS: ReadonlyArray<DashboardNavItem> = [
  { href: DASHBOARD_PATHS.home, label: 'Month Boards', title: 'Current Month', role: 'operational' },
  {
    href: DASHBOARD_PATHS.expensesAndIncome,
    label: 'Bills & Income',
    title: 'Bills & Income',
    role: 'defaults',
  },
  { href: DASHBOARD_PATHS.debtOverview, label: 'Debt Overview', title: 'Debt Overview', role: 'reporting' },
  { href: DASHBOARD_PATHS.archive, label: 'Archive', title: 'Archive', role: 'system' },
  { href: DASHBOARD_PATHS.settings, label: 'Settings', title: 'Settings', role: 'system' },
]

