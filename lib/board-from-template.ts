import { DEFAULT_HEADER_COLOR } from '@/components/modules/header-colors'
import { formatDueDateDisplay } from './due-date'
import { generateId } from './format'
import {
  incomeSourceLabel,
  resolveCreditorId,
  sortTemplatePayDateCards,
  templatePayDateSortValue,
} from './template-utils'
import type { Bill, Income, MonthlyBoard, PayDateCard, Template } from './types'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function resolveTemplatePayDateIso(
  defaultPayDate: string,
  month: number,
  year: number,
  monthOffset = 0
): string {
  // Apply offset to get the effective calendar month
  const shifted = new Date(year, month - 1 + monthOffset, 1)
  const effectiveMonth = shifted.getMonth() + 1
  const effectiveYear = shifted.getFullYear()

  const trimmed = defaultPayDate.trim()
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)!
    const y = iso[1]
    const m = String(Number(iso[2])).padStart(2, '0')
    const d = String(Number(iso[3])).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const lowered = trimmed.toLowerCase()
  let day: number
  if (lowered === 'last') {
    day = lastDayOfMonth(effectiveYear, effectiveMonth)
  } else {
    const parsed = Number.parseInt(lowered, 10)
    day = Number.isFinite(parsed) ? parsed : 1
  }
  day = Math.min(Math.max(day, 1), lastDayOfMonth(effectiveYear, effectiveMonth))
  const m = String(effectiveMonth).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${effectiveYear}-${m}-${d}`
}

function billDueDateForMonth(dueDate: string, boardMonth: number): string {
  const trimmed = dueDate.trim()
  if (!trimmed) return ''
  if (/^\d{1,2}$/.test(trimmed)) {
    return formatDueDateDisplay(`*/${trimmed}`, boardMonth)
  }
  return formatDueDateDisplay(trimmed, boardMonth)
}

export function buildMonthlyBoardFromTemplate(
  template: Template,
  month: number,
  year: number,
  incomes: Income[]
): MonthlyBoard {
  const sorted = sortTemplatePayDateCards(template.payDateCards)
  const payDateCards: PayDateCard[] = sorted.map((card, index) => {
    const payDate = resolveTemplatePayDateIso(card.defaultPayDate, month, year, card.defaultPayDateMonthOffset ?? 0)
    const payDay = templatePayDateSortValue(card.defaultPayDate, card.defaultPayDateMonthOffset ?? 0)
    const bills: Bill[] = card.bills.map(tb => ({
      id: generateId('bill'),
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
    const owner = card.assignedUserId
    const source = incomeSourceLabel(incomes, card.incomeSourceId)

    return {
      id: generateId('mod'),
      templatePayDateCardId: card.id,
      owner,
      source,
      payDate,
      payAmount: card.defaultPayAmount,
      bills,
      notes: [],
      isFromTemplate: true,
      sortOrder: index + 1,
      boardColumn: card.boardColumn ?? (payDay <= 15 ? 1 : 2),
      headerColor: card.headerColor ?? DEFAULT_HEADER_COLOR,
    }
  })

  const label = `${MONTH_NAMES[month - 1]} ${year}`
  const now = new Date().toISOString()

  return {
    id: generateId('board'),
    month,
    year,
    label,
    templateId: template.id,
    payDateCards,
    status: 'preparing',
    sharedNotes: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function monthYearOptions(count = 7): Array<{ month: number; year: number; label: string }> {
  const now = new Date()
  const options: Array<{ month: number; year: number; label: string }> = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    options.push({
      month,
      year,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
    })
  }
  return options
}
