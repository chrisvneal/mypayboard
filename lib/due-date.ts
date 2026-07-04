const MONTH_ABBREV: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

function toMonthDay(month: number, day: number): string {
  return `${month}/${day}`
}

export const ASAP_DUE_DATE = 'ASAP'

export function isAsapDueDate(dateStr: string): boolean {
  return dateStr.trim().toUpperCase() === ASAP_DUE_DATE
}

/** Normalize bill due dates to month/day only (e.g. 10/15), or ASAP. */
export function formatDueDateDisplay(dateStr: string, boardMonth?: number): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  if (isAsapDueDate(trimmed)) return ASAP_DUE_DATE

  const month = boardMonth ?? new Date().getMonth() + 1

  const starDay = /^\*\/(\d{1,2})$/.exec(trimmed)
  if (starDay) {
    return toMonthDay(month, Number(starDay[1]))
  }

  const dayMonthAbbrev = /^(\d{1,2})[-\s]+([a-zA-Z]{3,})$/i.exec(trimmed)
  if (dayMonthAbbrev) {
    const day = Number(dayMonthAbbrev[1])
    const m = MONTH_ABBREV[dayMonthAbbrev[2].slice(0, 3).toLowerCase()]
    if (m) return toMonthDay(m, day)
  }

  const monthDayAbbrev = /^([a-zA-Z]{3,})[-\s]+(\d{1,2})$/i.exec(trimmed)
  if (monthDayAbbrev) {
    const m = MONTH_ABBREV[monthDayAbbrev[1].slice(0, 3).toLowerCase()]
    const day = Number(monthDayAbbrev[2])
    if (m) return toMonthDay(m, day)
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  if (iso) {
    return toMonthDay(Number(iso[2]), Number(iso[3]))
  }

  const slashWithYear = /^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/.exec(trimmed)
  if (slashWithYear) {
    return toMonthDay(Number(slashWithYear[1]), Number(slashWithYear[2]))
  }

  const slash = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed)
  if (slash) {
    return toMonthDay(Number(slash[1]), Number(slash[2]))
  }

  if (/[a-zA-Z]{3,}/.test(trimmed) && trimmed.includes(',')) {
    const d = new Date(trimmed)
    if (!Number.isNaN(d.getTime())) {
      return toMonthDay(d.getMonth() + 1, d.getDate())
    }
  }

  if (/[a-zA-Z]/.test(trimmed)) return ''

  return trimmed
}

/** Normalize recurring master-list due dates to the recurring day pattern. */
export function formatRecurringDueDateDisplay(dateStr: string): string {
  if (!dateStr) return '—'
  const trimmed = dateStr.trim()
  if (isAsapDueDate(trimmed)) return ASAP_DUE_DATE
  if (trimmed.toLowerCase() === 'varies') return 'Varies'

  const starDay = /^\*\/(\d{1,2})$/.exec(trimmed)
  if (starDay) return `*/${Number(starDay[1])}`

  const formatted = formatDueDateDisplay(trimmed)
  const parts = formatted.split('/')
  if (parts.length === 2) {
    const day = Number(parts[1])
    return day ? `*/${day}` : '—'
  }

  const dayOnly = /^(\d{1,2})$/.exec(formatted)
  if (dayOnly) return `*/${Number(dayOnly[1])}`

  return formatted || '—'
}

/** ISO yyyy-mm-dd for <input type="date">, using board year for M/D values. */
export function dueDateToIso(dateStr: string, boardYear: number, boardMonth?: number): string {
  if (!dateStr || isAsapDueDate(dateStr)) return ''
  const display = formatDueDateDisplay(dateStr, boardMonth)
  const parts = display.split('/')
  if (parts.length !== 2) return ''
  const month = Number(parts[0])
  const day = Number(parts[1])
  if (!month || !day) return ''
  return `${boardYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * True when a bill is due strictly before the pay date card's payDate.
 *
 * The key planning question: will the money be available when this bill is due?
 * If the bill falls due before the paycheck lands, the answer is no — the bill
 * belongs on the previous pay period's card.
 *
 * cardPayDate must be an ISO date string (yyyy-mm-dd). If absent, returns false.
 * Template previews resolve a real ISO payDate for the card too, so this flags
 * template bills the same way it flags bills on a live board.
 */
export function isBillDueBeforePayDate(
  dueDate: string,
  boardMonth: number,
  boardYear: number,
  cardPayDate: string,
): boolean {
  if (!dueDate || !cardPayDate) return false
  const trimmed = dueDate.trim().toUpperCase()
  if (trimmed === ASAP_DUE_DATE || trimmed === 'VARIES') return false
  const billIso = dueDateToIso(dueDate, boardYear, boardMonth)
  if (!billIso) return false
  // ISO yyyy-mm-dd strings compare correctly as plain strings
  return billIso < cardPayDate
}

/** Sort key for due date column (MM/DD-style padding). */
export function dueDateSortKey(dateStr: string, boardMonth?: number): string {
  if (isAsapDueDate(dateStr)) return '99/99'
  const formatted = formatDueDateDisplay(dateStr, boardMonth)
  const parts = formatted.split('/')
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`
  }
  return formatted
}

/** Template bill due dates: day-of-month only (e.g. "16"), not M/D. */
export function formatTemplateDueDayDisplay(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()
  if (isAsapDueDate(trimmed)) return ASAP_DUE_DATE
  if (trimmed.toLowerCase() === 'varies') return 'Varies'

  if (/^\d{1,2}$/.test(trimmed)) return String(Number(trimmed))

  const starDay = /^\*\/(\d{1,2})$/.exec(trimmed)
  if (starDay) return String(Number(starDay[1]))

  const slash = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed)
  if (slash) return String(Number(slash[2]))

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  if (iso) return String(Number(iso[3]))

  const formatted = formatDueDateDisplay(trimmed)
  const parts = formatted.split('/')
  if (parts.length === 2) return String(Number(parts[1]))

  return formatted
}
