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

/**
 * Master-list creditor visibility rules (Creditor.muted on the admin list).
 *
 * - isVisibleCreditor — show on Expenses & Income (includes muted; still editable).
 * - countsInMonthlyBudget / isActiveCreditor — include in monthly expense summary totals.
 * - isDebtTrackedCreditor — show on Debt Overview when trackDebt is on; ignores master-list
 *   mute because balances/minimums still matter for debt tracking.
 *
 * Board bill mute (Bill.muted) is separate — skipped for that pay period only.
 */

/** On master list, not archived — includes muted rows */
export function isVisibleCreditor(creditor: Creditor): boolean {
  return creditor.active !== false && !creditor.archived
}

/** Counts toward monthly expense totals — active, not archived, not master-list muted */
export function isActiveCreditor(creditor: Creditor): boolean {
  return isVisibleCreditor(creditor) && !creditor.muted
}

/** Alias — planned monthly budget totals */
export const countsInMonthlyBudget = isActiveCreditor

export function isMasterListMutedCreditor(creditor: Creditor): boolean {
  return Boolean(creditor.muted)
}

/** Visible on admin list and master-list muted */
export function isMutedButVisibleCreditor(creditor: Creditor): boolean {
  return isVisibleCreditor(creditor) && isMasterListMutedCreditor(creditor)
}

export function isArchivedCreditor(creditor: Creditor): boolean {
  return creditor.active === false || Boolean(creditor.archived)
}

/** Archive tab — user explicitly archived this expense */
export function isExplicitlyArchivedCreditor(creditor: Creditor): boolean {
  return creditor.archived === true
}

/** Debt Overview and debt totals — trackDebt on; master-list mute does not exclude */
export function isDebtTrackedCreditor(creditor: Creditor): boolean {
  return creditor.trackDebt === true && creditor.active !== false && !creditor.archived
}

export type MasterListStatusFilter = 'all' | 'active' | 'muted'

export function matchesMasterListStatusFilter(
  creditor: Creditor,
  status: MasterListStatusFilter
): boolean {
  if (status === 'active') return isVisibleCreditor(creditor) && !creditor.muted
  if (status === 'muted') return isMutedButVisibleCreditor(creditor)
  return isVisibleCreditor(creditor)
}

export function filterVisibleCreditors(creditors: Creditor[]): Creditor[] {
  return creditors.filter(isVisibleCreditor)
}

export function filterDebtOverviewCreditors(creditors: Creditor[]): Creditor[] {
  return creditors.filter(isDebtTrackedCreditor)
}

/** Active master-list entries available when picking a bill on the monthly board */
export function filterMasterListPickerCreditors(creditors: Creditor[]): Creditor[] {
  return filterVisibleCreditors(creditors)
}

export type CreditorPickerGroup = {
  id: string
  label: string
  creditors: Creditor[]
}

/** Sectioned groups for bill pickers (templates, modules). */
export function groupCreditorsForPicker(
  creditors: Creditor[],
  options?: { customCategories?: string[] }
): CreditorPickerGroup[] {
  const visible = filterMasterListPickerCreditors(creditors)
  const storedGroups = (options?.customCategories ?? []).map(category => categoryKey(category))
  const dynamicGroups = visible
    .map(creditor => categoryKey(String(creditor.category)))
    .filter(key => !EXPENSE_CATEGORY_GROUPS.some(group => group.id === key))

  const groupDefs = [
    ...EXPENSE_CATEGORY_GROUPS,
    ...Array.from(new Set([...storedGroups, ...dynamicGroups]))
      .filter(key => !EXPENSE_CATEGORY_GROUPS.some(group => group.id === key))
      .map(key => ({
        id: key,
        label: categoryLabel(key, { customCategories: options?.customCategories }),
      })),
  ]

  return groupDefs
    .map(group => ({
      id: group.id,
      label: group.label,
      creditors: visible.filter(c => categoryKey(String(c.category)) === group.id),
    }))
    .filter(group => group.creditors.length > 0)
}

export function filterMutedVisibleCreditors(creditors: Creditor[]): Creditor[] {
  return creditors.filter(isMutedButVisibleCreditor)
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
