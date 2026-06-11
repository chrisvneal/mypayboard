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
  billsAndIncome: '/dashboard/bills-and-income',
  debtTracker: '/dashboard/debt-tracker',
  archive: '/dashboard/archive',
  settings: '/dashboard/settings',
  /** UI label: Organize Lists */
  settingsOrganize: '/dashboard/settings/organize',
} as const

export const DASHBOARD_NAV_ITEMS: ReadonlyArray<DashboardNavItem> = [
  { href: DASHBOARD_PATHS.home, label: 'Month Boards', title: 'Current Month', role: 'operational' },
  {
    href: DASHBOARD_PATHS.billsAndIncome,
    label: 'Bills & Income',
    title: 'Bills & Income',
    role: 'defaults',
  },
  { href: DASHBOARD_PATHS.debtTracker, label: 'Debt Tracker', title: 'Debt Tracker', role: 'reporting' },
  { href: DASHBOARD_PATHS.archive, label: 'Archive', title: 'Archive', role: 'system' },
  { href: DASHBOARD_PATHS.settings, label: 'Settings', title: 'Settings', role: 'system' },
]

