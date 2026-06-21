import { categoryDisplayName } from './creditors'
import { generateId } from './format'
import type { Creditor, Income, Template, TemplateBill, TemplatePayDateCard } from './types'

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

export function templatePayDateSortValue(defaultPayDate: string, monthOffset = 0): number {
  const trimmed = defaultPayDate.trim().toLowerCase()
  const base = monthOffset * 100
  if (trimmed === 'last') return base + 99
  const day = Number.parseInt(trimmed, 10)
  return Number.isFinite(day) ? base + day : base + 50
}

export function sortTemplatePayDateCards(
  cards: TemplatePayDateCard[]
): TemplatePayDateCard[] {
  return [...cards].sort((a, z) => {
    const payDayA = templatePayDateSortValue(a.defaultPayDate, a.defaultPayDateMonthOffset ?? 0)
    const payDayZ = templatePayDateSortValue(z.defaultPayDate, z.defaultPayDateMonthOffset ?? 0)
    const ca = a.boardColumn ?? (payDayA <= 15 ? 1 : 2)
    const cz = z.boardColumn ?? (payDayZ <= 15 ? 1 : 2)
    if (ca !== cz) return ca - cz
    return payDayA - payDayZ
  })
}

/** Default template first; all others keep creation order (newest last). */
export function sortTemplatesForDisplay(templates: Template[]): Template[] {
  return [...templates].sort((a, z) => {
    if (a.isDefault !== z.isDefault) return a.isDefault ? -1 : 1
    return new Date(a.createdAt).getTime() - new Date(z.createdAt).getTime()
  })
}

function cloneTemplateBill(bill: TemplateBill): TemplateBill {
  return { ...bill, id: generateId('tbill') }
}

function cloneTemplateCard(card: TemplatePayDateCard): TemplatePayDateCard {
  return {
    ...card,
    id: generateId('tcard'),
    bills: card.bills.map(cloneTemplateBill),
  }
}

export function deepCloneTemplate(source: Template, name: string): Template {
  const now = new Date().toISOString()
  return {
    ...structuredClone(source),
    id: generateId('template'),
    name,
    isDefault: false,
    payDateCards: source.payDateCards.map(cloneTemplateCard),
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
    payDateCards: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function refreshTemplateBillsFromMasterList(
  template: Template,
  creditors: Creditor[]
): Template {
  const payDateCards = template.payDateCards.map(card => ({
    ...card,
    bills: card.bills.map(bill => {
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
  return { ...template, payDateCards }
}

export function incomeSourceLabel(incomes: Income[], incomeSourceId: string): string {
  const resolved = resolveIncomeId(incomeSourceId)
  return incomes.find(i => i.id === resolved || i.id === incomeSourceId)?.name ?? ''
}
