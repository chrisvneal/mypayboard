import { formatDueDateDisplay } from './due-date'
import { resolveTemplatePayDateIso } from './board-from-template'
import { generateId } from './format'
import {
  incomeSourceLabel,
  resolveCreditorId,
  resolveIncomeId,
  sortTemplatePayDateCards,
  templatePayDateSortValue,
} from './template-utils'
import type { Bill, Income, PayDateModule, Template, TemplateBill, TemplatePayDateCard } from './types'

function defaultHeaderColorForOwner(ownerId: string): string {
  return ownerId === 'user-nicole' ? '#E8F7EE' : '#E6F1FB'
}

/** Reference month for template preview (display only). */
export function templatePreviewMonthYear(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

function billDueDateForMonth(dueDate: string, boardMonth: number): string {
  const trimmed = dueDate.trim()
  if (!trimmed) return ''
  if (/^\d{1,2}$/.test(trimmed)) {
    return formatDueDateDisplay(`*/${trimmed}`, boardMonth)
  }
  return formatDueDateDisplay(trimmed, boardMonth)
}

function billDueDateToTemplatePattern(dueDate: string): string {
  const trimmed = dueDate.trim()
  if (!trimmed) return ''
  const slash = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed)
  if (slash) return slash[2]
  const star = /^\*\/(\d{1,2})$/.exec(trimmed)
  if (star) return star[1]
  if (trimmed.toUpperCase() === 'ASAP') return 'ASAP'
  return trimmed
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function isoToTemplatePayDay(payDateIso: string, month: number, year: number): string {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(payDateIso.trim())
  if (!iso) return '15'
  const day = Number(iso[3])
  const last = lastDayOfMonth(year, month)
  if (day >= last) return 'last'
  return String(day)
}

export function resolveIncomeIdFromSource(incomes: Income[], source: string): string {
  const match = incomes.find(i => i.name === source)
  if (match) return match.id
  const partial = incomes.find(i => source && i.name.toLowerCase().includes(source.toLowerCase()))
  return partial?.id ?? incomes[0]?.id ?? ''
}

export function templateToPreviewModules(
  template: Template,
  month: number,
  year: number,
  incomes: Income[]
): PayDateModule[] {
  const sorted = sortTemplatePayDateCards(template.payDateCards)
  return sorted.map((card, index) => {
    const payDay = templatePayDateSortValue(card.defaultPayDate)
    const bills: Bill[] = card.bills.map(tb => ({
      id: tb.id,
      name: tb.name,
      amount: tb.amount,
      dueDate: billDueDateForMonth(tb.dueDate, month),
      category: tb.category,
      paid: false,
      muted: false,
      notes: '',
      origin: 'master',
      creditorId: resolveCreditorId(tb.masterListId),
    }))
    return {
      id: card.id,
      templateModuleId: card.id,
      owner: card.assignedUserId,
      source: incomeSourceLabel(incomes, card.incomeSourceId),
      payDate: resolveTemplatePayDateIso(card.defaultPayDate, month, year),
      payAmount: card.defaultPayAmount,
      bills,
      notes: [],
      isFromTemplate: true,
      sortOrder: index + 1,
      boardColumn: payDay <= 15 ? 1 : 2,
      headerColor: card.headerColor ?? defaultHeaderColorForOwner(card.assignedUserId),
    }
  })
}

export function previewModulesToTemplate(
  template: Template,
  modules: PayDateModule[],
  month: number,
  year: number,
  incomes: Income[]
): Template {
  const payDateCards: TemplatePayDateCard[] = modules.map(mod => ({
    id: mod.id,
    assignedUserId: mod.owner,
    incomeSourceId: resolveIncomeIdFromSource(incomes, mod.source),
    defaultPayAmount: mod.payAmount ?? 0,
    defaultPayDate: isoToTemplatePayDay(mod.payDate, month, year),
    headerColor: mod.headerColor,
    bills: mod.bills.map(
      (b): TemplateBill => ({
        id: b.id,
        masterListId: b.creditorId ?? b.id,
        name: b.name,
        amount: b.amount,
        dueDate: billDueDateToTemplatePattern(b.dueDate),
        category: String(b.category ?? ''),
      })
    ),
  }))
  return {
    ...template,
    payDateCards: sortTemplatePayDateCards(payDateCards),
  }
}

export function createBlankPreviewModule(
  template: Template,
  month: number,
  year: number,
  incomes: Income[]
): PayDateModule {
  const owner = template.assignedUserIds[0] ?? 'user-chris'
  const firstIncome = incomes.find(i => i.active !== false && !i.archived)
  return {
    id: generateId('tcard'),
    templateModuleId: undefined,
    owner,
    source: firstIncome?.name ?? '',
    payDate: resolveTemplatePayDateIso('15', month, year),
    payAmount: 0,
    bills: [],
    notes: [],
    isFromTemplate: true,
    sortOrder: 999,
    boardColumn: 1,
    headerColor: defaultHeaderColorForOwner(owner),
  }
}
