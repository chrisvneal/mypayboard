import { categoryDisplayName, categoryKey } from './creditors'
import { generateId } from './format'
import type { CategoryDefinition, Creditor, Income, IncomeSource } from './types'

export type CategoryScope = CategoryDefinition['scope']

const FALLBACK_NAME = 'Other'

const DEFAULT_EXPENSE_NAMES = [
  'Living Expenses',
  'Subscriptions',
  'Savings',
  'Credit Cards',
  FALLBACK_NAME,
] as const

const DEFAULT_INCOME_NAMES = ['Jobs', 'Benefits', 'Business', FALLBACK_NAME] as const

const LEGACY_EXPENSE_ALIASES: Record<string, string> = {
  living: 'Living Expenses',
  subscriptions: 'Subscriptions',
  savings: 'Savings',
  creditors: 'Credit Cards',
  'credit cards': 'Credit Cards',
  miscellaneous: FALLBACK_NAME,
  other: FALLBACK_NAME,
}

const LEGACY_INCOME_ALIASES: Record<string, string> = {
  jobs: 'Jobs',
  job: 'Jobs',
  benefits: 'Benefits',
  benefit: 'Benefits',
  business: 'Business',
  other: FALLBACK_NAME,
}

function normalizeCategoryName(name: string): string {
  return name.trim()
}

function namesMatch(a: string, b: string): boolean {
  return normalizeCategoryName(a).toLowerCase() === normalizeCategoryName(b).toLowerCase()
}

export function isFallbackCategory(category: CategoryDefinition): boolean {
  return category.scope === 'expense'
    ? namesMatch(category.name, FALLBACK_NAME)
    : namesMatch(category.name, FALLBACK_NAME)
}

export function fallbackCategoryHint(scope: CategoryScope): string {
  return scope === 'expense'
    ? '(fallback group for unnamed bills)'
    : '(fallback group for unnamed income)'
}

export function createDefaultCategoryDefinitions(
  scope: CategoryScope,
  createdAt = new Date().toISOString()
): CategoryDefinition[] {
  const names = scope === 'expense' ? DEFAULT_EXPENSE_NAMES : DEFAULT_INCOME_NAMES
  return names.map((name, index) => ({
    id: generateId(scope === 'expense' ? 'ecat' : 'icat'),
    name,
    scope,
    isDefault: true,
    order: index,
    createdAt,
  }))
}

function isCategoryDefinition(value: unknown): value is CategoryDefinition {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as CategoryDefinition).id === 'string' &&
    typeof (value as CategoryDefinition).name === 'string' &&
    ((value as CategoryDefinition).scope === 'expense' ||
      (value as CategoryDefinition).scope === 'income')
  )
}

function legacyExpenseName(raw: string): string {
  const normalized = raw.trim().toLowerCase()
  if (LEGACY_EXPENSE_ALIASES[normalized]) return LEGACY_EXPENSE_ALIASES[normalized]
  return categoryDisplayName(raw)
}

function legacyIncomeName(raw: string): string {
  const normalized = raw.trim().toLowerCase()
  if (LEGACY_INCOME_ALIASES[normalized]) return LEGACY_INCOME_ALIASES[normalized]
  return raw.trim()
}

/** Convert legacy string[] category lists to CategoryDefinition[]. */
export function migrateLegacyCategoryArray(
  scope: CategoryScope,
  raw: unknown,
  createdAt = new Date().toISOString()
): CategoryDefinition[] {
  const defaults = createDefaultCategoryDefinitions(scope, createdAt)
  if (!Array.isArray(raw) || raw.length === 0) return defaults

  if (isCategoryDefinition(raw[0])) {
    const typed = raw as CategoryDefinition[]
    return typed
      .filter(item => item.scope === scope)
      .map((item, index) => ({
        ...item,
        scope,
        order: typeof item.order === 'number' ? item.order : index,
      }))
      .sort((a, b) => a.order - b.order)
      .map((item, index) => ({ ...item, order: index }))
  }

  const stringEntries = raw.filter((item): item is string => typeof item === 'string')
  const mergedNames: string[] = []
  const addName = (name: string) => {
    const next = scope === 'expense' ? legacyExpenseName(name) : legacyIncomeName(name)
    if (!next) return
    if (mergedNames.some(existing => namesMatch(existing, next))) return
    mergedNames.push(next)
  }

  defaults.forEach(item => addName(item.name))
  stringEntries.forEach(addName)

  if (!mergedNames.some(name => namesMatch(name, FALLBACK_NAME))) {
    mergedNames.push(FALLBACK_NAME)
  }

  return mergedNames.map((name, index) => {
    const defaultMatch = defaults.find(item => namesMatch(item.name, name))
    return {
      id: defaultMatch?.id ?? generateId(scope === 'expense' ? 'ecat' : 'icat'),
      name,
      scope,
      isDefault: Boolean(defaultMatch?.isDefault ?? defaults.some(item => namesMatch(item.name, name))),
      order: index,
      createdAt: defaultMatch?.createdAt ?? createdAt,
    }
  })
}

/** Guarantee default category seeds exist before migration or UI reads. */
export function ensureCategorySeeds(
  expenseRaw: unknown,
  incomeRaw: unknown,
  createdAt = new Date().toISOString()
): {
  expenseCategories: CategoryDefinition[]
  incomeCategories: CategoryDefinition[]
} {
  let expenseCategories = migrateLegacyCategoryArray('expense', expenseRaw, createdAt)
  let incomeCategories = migrateLegacyCategoryArray('income', incomeRaw, createdAt)

  if (expenseCategories.length === 0) {
    expenseCategories = createDefaultCategoryDefinitions('expense', createdAt)
  }
  if (incomeCategories.length === 0) {
    incomeCategories = createDefaultCategoryDefinitions('income', createdAt)
  }

  return { expenseCategories, incomeCategories }
}

export function sortCategoriesForDisplay(
  categories: CategoryDefinition[],
  scope: CategoryScope
): CategoryDefinition[] {
  const scoped = categories.filter(item => item.scope === scope)
  const fallback = scoped.find(isFallbackCategory)
  const rest = scoped
    .filter(item => !isFallbackCategory(item))
    .sort((a, b) => a.order - b.order)
  return fallback ? [...rest, fallback] : rest
}

/** Dropdown order: by `order`, with fallback last. */
export function sortCategoriesForDropdown(
  categories: CategoryDefinition[],
  scope: CategoryScope
): CategoryDefinition[] {
  return sortCategoriesForDisplay(categories, scope)
}

export function findCategoryById(
  categories: CategoryDefinition[],
  id: string | undefined
): CategoryDefinition | undefined {
  if (!id) return undefined
  return categories.find(item => item.id === id)
}

export function findCategoryByName(
  categories: CategoryDefinition[],
  scope: CategoryScope,
  name: string
): CategoryDefinition | undefined {
  const normalized = scope === 'expense' ? legacyExpenseName(name) : legacyIncomeName(name)
  return categories.find(
    item => item.scope === scope && namesMatch(item.name, normalized)
  )
}

export function getFallbackCategory(
  categories: CategoryDefinition[],
  scope: CategoryScope
): CategoryDefinition {
  const fallback =
    categories.find(item => item.scope === scope && isFallbackCategory(item)) ??
    createDefaultCategoryDefinitions(scope).find(isFallbackCategory)
  if (!fallback) {
    throw new Error(`Missing fallback category for scope "${scope}"`)
  }
  return fallback
}

export function resolveCreditorCategoryId(
  creditor: Creditor,
  expenseCategories: CategoryDefinition[]
): string {
  if (creditor.categoryId) {
    const byId = findCategoryById(expenseCategories, creditor.categoryId)
    if (byId) return byId.id
  }
  const matched =
    findCategoryByName(expenseCategories, 'expense', String(creditor.category)) ??
    getFallbackCategory(expenseCategories, 'expense')
  return matched.id
}

export function resolveIncomeCategoryId(
  income: IncomeSource,
  incomeCategories: CategoryDefinition[]
): string {
  if (income.categoryId) {
    const byId = findCategoryById(incomeCategories, income.categoryId)
    if (byId) return byId.id
  }
  const matched =
    findCategoryByName(incomeCategories, 'income', income.group) ??
    getFallbackCategory(incomeCategories, 'income')
  return matched.id
}

export function creditorMatchesCategory(
  creditor: Creditor,
  category: CategoryDefinition,
  expenseCategories: CategoryDefinition[]
): boolean {
  const categoryId = resolveCreditorCategoryId(creditor, expenseCategories)
  return categoryId === category.id
}

export function incomeMatchesCategory(
  income: IncomeSource,
  category: CategoryDefinition,
  incomeCategories: CategoryDefinition[]
): boolean {
  const categoryId = resolveIncomeCategoryId(income, incomeCategories)
  return categoryId === category.id
}

export function countCreditorsInCategory(
  creditors: Creditor[],
  category: CategoryDefinition,
  expenseCategories: CategoryDefinition[]
): number {
  return creditors.filter(creditor =>
    creditorMatchesCategory(creditor, category, expenseCategories)
  ).length
}

export function countIncomesInCategory(
  incomes: IncomeSource[],
  category: CategoryDefinition,
  incomeCategories: CategoryDefinition[]
): number {
  return incomes.filter(income => incomeMatchesCategory(income, category, incomeCategories)).length
}

/** Legacy UI helpers — board pickers and archive still expect string[]. */
export function categoryNamesForLegacyUI(categories: CategoryDefinition[]): string[] {
  return sortCategoriesForDisplay(categories, 'expense').map(item => item.name)
}

export function incomeGroupNamesForLegacyUI(categories: CategoryDefinition[]): string[] {
  return sortCategoriesForDisplay(categories, 'income').map(item => item.name)
}

export function migrateRecordCategoryIds(
  creditors: Creditor[],
  incomes: Income[],
  expenseCategories: CategoryDefinition[],
  incomeCategories: CategoryDefinition[]
): { creditors: Creditor[]; incomes: Income[]; migratedCount: number } {
  let migratedCount = 0

  const nextCreditors = creditors.map(creditor => {
    if (creditor.categoryId) {
      const existing = findCategoryById(expenseCategories, creditor.categoryId)
      if (existing) {
        if (namesMatch(String(creditor.category), existing.name)) return creditor
        migratedCount += 1
        return { ...creditor, category: existing.name as Creditor['category'] }
      }
    }
    const matched =
      findCategoryByName(expenseCategories, 'expense', String(creditor.category)) ??
      getFallbackCategory(expenseCategories, 'expense')
    if (creditor.categoryId === matched.id && namesMatch(String(creditor.category), matched.name)) {
      return creditor
    }
    migratedCount += 1
    return {
      ...creditor,
      categoryId: matched.id,
      category: matched.name as Creditor['category'],
    }
  })

  const nextIncomes = incomes.map(income => {
    if (income.categoryId) {
      const existing = findCategoryById(incomeCategories, income.categoryId)
      if (existing) {
        if (namesMatch(income.group, existing.name)) return income
        migratedCount += 1
        return { ...income, group: existing.name }
      }
    }
    const matched =
      findCategoryByName(incomeCategories, 'income', income.group) ??
      getFallbackCategory(incomeCategories, 'income')
    if (income.categoryId === matched.id && namesMatch(income.group, matched.name)) {
      return income
    }
    migratedCount += 1
    return {
      ...income,
      categoryId: matched.id,
      group: matched.name,
    }
  })

  return { creditors: nextCreditors, incomes: nextIncomes, migratedCount }
}

export function reassignItemsFromDeletedCategories(
  creditors: Creditor[],
  incomes: Income[],
  deletedCategories: CategoryDefinition[],
  expenseCategories: CategoryDefinition[],
  incomeCategories: CategoryDefinition[]
): { creditors: Creditor[]; incomes: Income[]; logs: string[] } {
  const logs: string[] = []
  const expenseFallback = getFallbackCategory(expenseCategories, 'expense')
  const incomeFallback = getFallbackCategory(incomeCategories, 'income')

  let nextCreditors = creditors
  for (const deleted of deletedCategories.filter(item => item.scope === 'expense')) {
    if (isFallbackCategory(deleted)) continue
    const affected = nextCreditors.filter(creditor => {
      const id = resolveCreditorCategoryId(creditor, expenseCategories)
      return id === deleted.id
    })
    if (affected.length === 0) continue
    logs.push(
      `[Organize] Reassigned ${affected.length} items from "${deleted.name}" to "${expenseFallback.name}"`
    )
    nextCreditors = nextCreditors.map(creditor => {
      const id = resolveCreditorCategoryId(creditor, expenseCategories)
      if (id !== deleted.id) return creditor
      return {
        ...creditor,
        categoryId: expenseFallback.id,
        category: expenseFallback.name as Creditor['category'],
      }
    })
  }

  let nextIncomes = incomes
  for (const deleted of deletedCategories.filter(item => item.scope === 'income')) {
    if (isFallbackCategory(deleted)) continue
    const affected = nextIncomes.filter(income => {
      const id = resolveIncomeCategoryId(income, incomeCategories)
      return id === deleted.id
    })
    if (affected.length === 0) continue
    logs.push(
      `[Organize] Reassigned ${affected.length} items from "${deleted.name}" to "${incomeFallback.name}"`
    )
    nextIncomes = nextIncomes.map(income => {
      const id = resolveIncomeCategoryId(income, incomeCategories)
      if (id !== deleted.id) return income
      return {
        ...income,
        categoryId: incomeFallback.id,
        group: incomeFallback.name,
      }
    })
  }

  return { creditors: nextCreditors, incomes: nextIncomes, logs }
}

export function normalizeCategoryOrders(categories: CategoryDefinition[]): CategoryDefinition[] {
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }))
}

/** Match legacy category keys for open-state prefs during transition. */
export function categoryGroupKey(category: CategoryDefinition): string {
  if (category.scope === 'expense') {
    return categoryKey(category.name)
  }
  return category.name.trim().toLowerCase()
}
