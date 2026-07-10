import { categoryDisplayName } from './creditors'
import { generateId } from './format'
import type { Creditor, Income, Template, TemplateBill, TemplatePayDateCard } from './types'

export function findCreditorForTemplateBill(
  creditors: Creditor[],
  masterListId: string
): Creditor | undefined {
  return creditors.find(c => c.id === masterListId)
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

/** Next template in display order when the current default is unset or deleted. */
export function promoteNextDefaultTemplateId(
  templates: Template[],
  currentDefaultId: string
): string | null {
  if (templates.length <= 1) return null
  const sorted = sortTemplatesForDisplay(templates)
  const currentIndex = sorted.findIndex(t => t.id === currentDefaultId)
  if (currentIndex === -1) {
    return sorted.find(t => t.id !== currentDefaultId)?.id ?? null
  }
  const next = sorted[currentIndex + 1]
  return next?.id ?? null
}

/**
 * Enforce template default invariants:
 * - one template → always default
 * - multiple templates → exactly one default (repair 0 or many)
 */
export function normalizeTemplateDefaults(templates: Template[]): Template[] {
  if (templates.length === 0) return templates
  if (templates.length === 1) {
    return templates[0].isDefault ? templates : [{ ...templates[0], isDefault: true }]
  }

  const defaults = templates.filter(t => t.isDefault)
  if (defaults.length === 1) return templates

  const winner =
    (defaults.length > 0 ? sortTemplatesForDisplay(defaults)[0] : null) ??
    sortTemplatesForDisplay(templates)[0]
  if (!winner) return templates

  return templates.map(t => ({ ...t, isDefault: t.id === winner.id }))
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
      if (bill.isOneOff) return bill
      const creditor = findCreditorForTemplateBill(creditors, bill.masterListId)
      if (!creditor) return bill
      return {
        ...bill,
        name: creditor.name,
        nameOverride: undefined,
        amount: creditor.defaultAmount,
        category: categoryDisplayName(String(creditor.category)),
      }
    }),
  }))
  return { ...template, payDateCards }
}

export function incomeSourceLabel(incomes: Income[], incomeSourceId: string): string {
  return incomes.find(i => i.id === incomeSourceId)?.name ?? ''
}
