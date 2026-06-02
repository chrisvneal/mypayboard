import { categoryDisplayName } from './creditors'
import { generateId } from './format'
import type { Creditor, Income, Template, TemplateBill, TemplatePayDateModule } from './types'

/** Maps template mock / legacy ids to current master-list creditor ids */
export const MASTER_LIST_CREDITOR_ALIASES: Record<string, string> = {
  'expense-freedom-mortgage': 'c-01',
  'expense-disney': 'c-18',
  'expense-bestbuy': 'c-24',
}

export const MASTER_LIST_INCOME_ALIASES: Record<string, string> = {
  'income-blackstone': 'inc-02',
  'income-sungage': 'inc-03',
}

export function resolveCreditorId(masterListId: string): string {
  return MASTER_LIST_CREDITOR_ALIASES[masterListId] ?? masterListId
}

export function resolveIncomeId(incomeSourceId: string): string {
  return MASTER_LIST_INCOME_ALIASES[incomeSourceId] ?? incomeSourceId
}

export function findCreditorForTemplateBill(
  creditors: Creditor[],
  masterListId: string
): Creditor | undefined {
  const resolved = resolveCreditorId(masterListId)
  return (
    creditors.find(c => c.id === resolved) ??
    creditors.find(c => c.id === masterListId)
  )
}

export function templatePayDateSortValue(defaultPayDate: string): number {
  const trimmed = defaultPayDate.trim().toLowerCase()
  if (trimmed === 'last') return 99
  const day = Number.parseInt(trimmed, 10)
  return Number.isFinite(day) ? day : 50
}

export function sortTemplatePayDateModules(
  modules: TemplatePayDateModule[]
): TemplatePayDateModule[] {
  return [...modules].sort(
    (a, z) => templatePayDateSortValue(a.defaultPayDate) - templatePayDateSortValue(z.defaultPayDate)
  )
}

function cloneTemplateBill(bill: TemplateBill): TemplateBill {
  return { ...bill, id: generateId('tbill') }
}

function cloneTemplateModule(mod: TemplatePayDateModule): TemplatePayDateModule {
  return {
    ...mod,
    id: generateId('tmod'),
    bills: mod.bills.map(cloneTemplateBill),
  }
}

export function deepCloneTemplate(source: Template, name: string): Template {
  const now = new Date().toISOString()
  return {
    ...structuredClone(source),
    id: generateId('template'),
    name,
    isDefault: false,
    payDateModules: source.payDateModules.map(cloneTemplateModule),
    createdAt: now,
    updatedAt: now,
  }
}

export function createBlankTemplate(name: string, assignedUserIds: string[]): Template {
  const now = new Date().toISOString()
  return {
    id: generateId('template'),
    name,
    isDefault: false,
    assignedUserIds,
    payDateModules: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function refreshTemplateBillsFromMasterList(
  template: Template,
  creditors: Creditor[]
): Template {
  const payDateModules = template.payDateModules.map(mod => ({
    ...mod,
    bills: mod.bills.map(bill => {
      const creditor = findCreditorForTemplateBill(creditors, bill.masterListId)
      if (!creditor) return bill
      return {
        ...bill,
        name: creditor.name,
        amount: creditor.defaultAmount,
        category: categoryDisplayName(String(creditor.category)),
      }
    }),
  }))
  return { ...template, payDateModules }
}

export function incomeSourceLabel(incomes: Income[], incomeSourceId: string): string {
  const resolved = resolveIncomeId(incomeSourceId)
  return incomes.find(i => i.id === resolved || i.id === incomeSourceId)?.name ?? ''
}
