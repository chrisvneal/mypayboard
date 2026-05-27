export type DashboardPageRole = 'operational' | 'defaults' | 'reporting' | 'system'

export type DashboardNavItem = {
  href: string
  label: string
  title: string
  role: DashboardPageRole
}

export const DASHBOARD_PATHS = {
  home: '/dashboard',
  templates: '/dashboard/templates',
  expensesAndIncome: '/dashboard/expenses-and-income',
  debtOverview: '/dashboard/debt-overview',
  archive: '/dashboard/archive',
  settings: '/dashboard/settings',
} as const

export const DASHBOARD_NAV_ITEMS: ReadonlyArray<DashboardNavItem> = [
  { href: DASHBOARD_PATHS.home, label: 'Current Month', title: 'Current Month', role: 'operational' },
  { href: DASHBOARD_PATHS.templates, label: 'Templates', title: 'Templates', role: 'operational' },
  {
    href: DASHBOARD_PATHS.expensesAndIncome,
    label: 'Expenses & Income',
    title: 'Expenses & Income',
    role: 'defaults',
  },
  { href: DASHBOARD_PATHS.debtOverview, label: 'Debt Overview', title: 'Debt Overview', role: 'reporting' },
  { href: DASHBOARD_PATHS.archive, label: 'Archive', title: 'Archive', role: 'system' },
  { href: DASHBOARD_PATHS.settings, label: 'Settings', title: 'Settings', role: 'system' },
]

