import { parseMoneyInput } from './money-input'
import type { Creditor } from './types'

/** Canonical expense groups for master-list UI (admin) grouping */
export const EXPENSE_CATEGORY_GROUPS = [
  { id: 'living', label: 'Living Expenses' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'savings', label: 'Savings' },
  { id: 'creditors', label: 'Credit Cards' },
] as const

export type ExpenseCategoryGroupId = (typeof EXPENSE_CATEGORY_GROUPS)[number]['id']

/** Stable group id for sorting/filtering — maps legacy slug + display names */
export function categoryKey(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living expenses' || normalized === 'living') return 'living'
  if (normalized === 'subscriptions' || normalized === 'subscription') return 'subscriptions'
  if (normalized === 'savings' || normalized === 'saving') return 'savings'
  if (normalized === 'creditors' || normalized === 'creditor' || normalized === 'credit cards') {
    return 'creditors'
  }
  return category
}

/** Human-readable category name for storage and lists */
export function categoryDisplayName(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living' || normalized === 'living expenses') return 'Living Expenses'
  if (normalized === 'subscriptions') return 'Subscriptions'
  if (normalized === 'savings') return 'Savings'
  if (normalized === 'creditors' || normalized === 'creditor' || normalized === 'credit cards') {
    return 'Credit Cards'
  }
  return category
}

/** Label for UI — prefers built-in groups, then custom household categories */
export function categoryLabel(
  category: string,
  options?: { customCategories?: string[] }
): string {
  const key = categoryKey(category)
  const builtIn = EXPENSE_CATEGORY_GROUPS.find(group => group.id === key)
  if (builtIn) return builtIn.label

  const custom = options?.customCategories?.find(item => categoryKey(item) === key)
  if (custom) return categoryDisplayName(custom)

  return categoryDisplayName(category)
}

export function dueDayFromPattern(pattern?: string): Creditor['dueDay'] {
  if (!pattern) return null
  if (pattern.toUpperCase() === 'ASAP') return 'asap'
  const match = /\/(\d{1,2})$/.exec(pattern)
  if (match) return Number(match[1])
  const dayMonth = /^(\d{1,2})[-\s]+[a-zA-Z]{3,}$/.exec(pattern)
  if (dayMonth) return Number(dayMonth[1])
  return null
}

/** Numeric due day for sorting/display — does not resolve varies/asap */
export function creditorDueDay(creditor: Creditor): number | null {
  if (typeof creditor.dueDay === 'number') return creditor.dueDay
  const fromPattern = dueDayFromPattern(creditor.dueDatePattern)
  return typeof fromPattern === 'number' ? fromPattern : null
}

/** On master list, not archived — includes muted rows */
export function isVisibleCreditor(creditor: Creditor): boolean {
  return creditor.active !== false && !creditor.archived
}

/** Counts toward monthly expense totals — active, not archived, not muted */
export function isActiveCreditor(creditor: Creditor): boolean {
  return creditor.active !== false && !creditor.archived && !creditor.muted
}

export function isArchivedCreditor(creditor: Creditor): boolean {
  return creditor.active === false || Boolean(creditor.archived)
}

/** Archive tab — user explicitly archived this expense */
export function isExplicitlyArchivedCreditor(creditor: Creditor): boolean {
  return creditor.archived === true
}

/** Debt Overview and debt totals */
export function isDebtTrackedCreditor(creditor: Creditor): boolean {
  return creditor.trackDebt === true && creditor.active !== false && !creditor.archived
}

/** Budget / master-list planned payment — use for expense totals and board bill defaults */
export function plannedMonthlyPayment(creditor: Creditor): number {
  return creditor.defaultAmount
}

/** Lender minimum for Debt Overview — falls back to planned amount when unset */
export function debtMinimumPayment(creditor: Creditor): number {
  if (!creditor.trackDebt) return 0
  const min = creditor.debtDetail?.minMonthlyPayment
  if (typeof min === 'number') return min
  return creditor.defaultAmount
}

/**
 * Resolve minMonthlyPayment on master-list save.
 * Empty min field → keep existing min, else use planned amount.
 */
export function resolveMinMonthlyPaymentOnSave(
  plannedAmount: number,
  minPaymentDraft: string,
  previousMin?: number
): number {
  const parsed = parseMoneyInput(minPaymentDraft)
  if (parsed !== null) return parsed
  if (!minPaymentDraft.trim() && typeof previousMin === 'number') return previousMin
  return plannedAmount
}

export function mergeExpenseCategories(...groups: Array<Array<string | undefined>>): string[] {
  const categories: string[] = []
  groups.flat().forEach(category => {
    const next = category?.trim()
    if (!next) return
    const display = categoryDisplayName(next)
    if (!categories.some(existing => existing.toLowerCase() === display.toLowerCase())) {
      categories.push(display)
    }
  })
  return categories
}
