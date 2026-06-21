import { formatDueDateDisplay } from './due-date'
import { resolveTemplatePayDateIso } from './board-from-template'
import { generateId } from './format'
import {
  incomeSourceLabel,
  resolveCreditorId,
  sortTemplatePayDateCards,
  templatePayDateSortValue,
} from './template-utils'
import { DEFAULT_HEADER_COLOR } from '@/components/modules/header-colors'
import type { Bill, BoardColumn, Income, PayDateCard, Template, TemplateBill, TemplatePayDateCard } from './types'

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

export function isoToTemplatePayDay(
  payDateIso: string,
  month: number,
  year: number
): { day: string; monthOffset: number } {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(payDateIso.trim())
  if (!iso) return { day: '15', monthOffset: 0 }

  const pickedYear = Number(iso[1])
  const pickedMonth = Number(iso[2])
  const pickedDay = Number(iso[3])

  // Detect whether the picked date is one month ahead of the preview month
  const monthOffset =
    pickedYear > year || (pickedYear === year && pickedMonth > month) ? 1 : 0

  // Use the offset-adjusted month to determine whether this day is the last of that month
  const shifted = new Date(year, month - 1 + monthOffset, 1)
  const last = lastDayOfMonth(shifted.getFullYear(), shifted.getMonth() + 1)

  return { day: pickedDay >= last ? 'last' : String(pickedDay), monthOffset }
}

export function resolveIncomeIdFromSource(incomes: Income[], source: string): string {
  const match = incomes.find(i => i.name === source)
  if (match) return match.id
  const partial = incomes.find(i => source && i.name.toLowerCase().includes(source.toLowerCase()))
  return partial?.id ?? incomes[0]?.id ?? ''
}

function defaultBoardColumnForPayDay(payDay: number): BoardColumn {
  return payDay <= 15 ? 1 : 2
}

export function templateToPreviewPayDateCards(
  template: Template,
  month: number,
  year: number,
  incomes: Income[]
): PayDateCard[] {
  const sorted = sortTemplatePayDateCards(template.payDateCards)
  return sorted.map((card, index) => {
    const offset = card.defaultPayDateMonthOffset ?? 0
    const payDay = templatePayDateSortValue(card.defaultPayDate, offset)
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
      templatePayDateCardId: card.id,
      owner: card.assignedUserId,
      source: incomeSourceLabel(incomes, card.incomeSourceId),
      payDate: resolveTemplatePayDateIso(card.defaultPayDate, month, year, offset),
      payAmount: card.defaultPayAmount,
      bills,
      notes: [],
      isFromTemplate: true,
      sortOrder: index + 1,
      boardColumn: card.boardColumn ?? defaultBoardColumnForPayDay(payDay),
      headerColor: card.headerColor ?? DEFAULT_HEADER_COLOR,
    }
  })
}

export function previewPayDateCardsToTemplate(
  template: Template,
  payDateCards: PayDateCard[],
  month: number,
  year: number,
  incomes: Income[]
): Template {
  const templateCards: TemplatePayDateCard[] = payDateCards.map(card => {
    const { day, monthOffset } = isoToTemplatePayDay(card.payDate, month, year)
    return {
    id: card.id,
    assignedUserId: card.owner,
    incomeSourceId: resolveIncomeIdFromSource(incomes, card.source),
    defaultPayAmount: card.payAmount ?? 0,
    defaultPayDate: day,
    defaultPayDateMonthOffset: monthOffset,
    boardColumn: card.boardColumn,
    headerColor: card.headerColor,
    bills: card.bills.map(
      (b): TemplateBill => ({
        id: b.id,
        masterListId: b.creditorId ?? b.id,
        name: b.name,
        amount: b.amount,
        dueDate: billDueDateToTemplatePattern(b.dueDate),
        category: String(b.category ?? ''),
      })
    ),
  }
  })
  return {
    ...template,
    payDateCards: sortTemplatePayDateCards(templateCards),
  }
}

export function createBlankPreviewPayDateCard(
  template: Template,
  month: number,
  year: number,
  incomes: Income[]
): PayDateCard {
  const owner = template.assignedUserIds[0] ?? 'user-chris'
  const firstIncome = incomes.find(i => i.active !== false && !i.archived)
  return {
    id: generateId('tcard'),
    templatePayDateCardId: undefined,
    owner,
    source: firstIncome?.name ?? '',
    payDate: resolveTemplatePayDateIso('15', month, year),
    payAmount: 0,
    bills: [],
    notes: [],
    isFromTemplate: true,
    sortOrder: 999,
    boardColumn: 1,
    headerColor: DEFAULT_HEADER_COLOR,
  }
}
