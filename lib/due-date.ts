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

/** Shift a 1–12 month forward one month when dueNextMonth is set, wrapping Dec → Jan. */
function resolveDueMonth(month: number, dueNextMonth: boolean): { month: number; yearRolled: boolean } {
  if (!dueNextMonth) return { month, yearRolled: false }
  return month === 12 ? { month: 1, yearRolled: true } : { month: month + 1, yearRolled: false }
}

/**
 * Last valid day of `month` (1–12) in `year` — leap-year aware. Day 0 of the
 * following month is the last day of this one; the standard JS trick for it.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Clamp a recurring "*\/D" day to the last real day of the month it resolves
 * against — day 31 in a 30-day month becomes the 30th, day 29/30/31 in
 * February becomes the 28th (29th in a leap year).
 */
function clampDayToMonth(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month))
}

/**
 * Normalize bill due dates to month/day only (e.g. 10/15), or ASAP.
 *
 * dueNextMonth only affects the recurring "*\/N" day pattern — the one genuinely
 * ambiguous case, since boardMonth is a fallback there. Explicit dates (ISO, M/D,
 * "15 Jun", etc.) already carry their own real month and are left alone.
 *
 * boardYear is only needed to get February's leap-year clamp exactly right —
 * every other month's day count is year-independent. Falls back to the
 * current year when omitted (callers without a specific board year in scope),
 * which only risks a wrong Feb 28-vs-29 clamp, never an invalid date.
 */
export function formatDueDateDisplay(
  dateStr: string,
  boardMonth?: number,
  dueNextMonth = false,
  boardYear?: number
): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  if (isAsapDueDate(trimmed)) return ASAP_DUE_DATE

  const month = boardMonth ?? new Date().getMonth() + 1

  const starDay = /^\*\/(\d{1,2})$/.exec(trimmed)
  if (starDay) {
    const { month: resolvedMonth, yearRolled } = resolveDueMonth(month, dueNextMonth)
    const year = (boardYear ?? new Date().getFullYear()) + (yearRolled ? 1 : 0)
    const day = clampDayToMonth(year, resolvedMonth, Number(starDay[1]))
    return toMonthDay(resolvedMonth, day)
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
export function dueDateToIso(
  dateStr: string,
  boardYear: number,
  boardMonth?: number,
  dueNextMonth = false
): string {
  if (!dateStr || isAsapDueDate(dateStr)) return ''
  // Pass boardYear through so the day clamp inside formatDueDateDisplay uses
  // the real year (leap-year correctness) — and so display/ISO always agree
  // on the same clamped day, since ISO's day is parsed back out of display.
  const display = formatDueDateDisplay(dateStr, boardMonth, dueNextMonth, boardYear)
  const parts = display.split('/')
  if (parts.length !== 2) return ''
  const month = Number(parts[0])
  const day = Number(parts[1])
  if (!month || !day) return ''
  // Only the recurring "*\/N" pattern actually applies dueNextMonth (see
  // formatDueDateDisplay) — scope the year rollover to that same case so an
  // already-explicit date isn't shifted a second time.
  const isRecurringPattern = /^\*\/(\d{1,2})$/.test(dateStr.trim())
  const baseMonth = boardMonth ?? new Date().getMonth() + 1

  let year: number
  if (isRecurringPattern) {
    const { yearRolled } = resolveDueMonth(baseMonth, dueNextMonth)
    year = yearRolled ? boardYear + 1 : boardYear
  } else if (baseMonth === 12 && month === 1) {
    // Explicit date picker is bounded to the board's month ± 1 (see
    // DueDateEditor.tsx) — a January pick on a December board can only mean
    // the following January (December has no 13th month to stay within),
    // never the same calendar year as the board.
    year = boardYear + 1
  } else if (baseMonth === 1 && month === 12) {
    // Mirror case: a December pick on a January board means the December
    // just before it, not the board's own year.
    year = boardYear - 1
  } else {
    year = boardYear
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
  dueNextMonth = false,
): boolean {
  if (!dueDate || !cardPayDate) return false
  const trimmed = dueDate.trim().toUpperCase()
  if (trimmed === ASAP_DUE_DATE || trimmed === 'VARIES') return false
  const billIso = dueDateToIso(dueDate, boardYear, boardMonth, dueNextMonth)
  if (!billIso) return false
  // ISO yyyy-mm-dd strings compare correctly as plain strings
  return billIso < cardPayDate
}

/** Sort key for due date column (MM/DD-style padding). */
export function dueDateSortKey(dateStr: string, boardMonth?: number, dueNextMonth = false): string {
  if (isAsapDueDate(dateStr)) return '99/99'
  const formatted = formatDueDateDisplay(dateStr, boardMonth, dueNextMonth)
  const parts = formatted.split('/')
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`
  }
  return formatted
}

/**
 * Normalize a TemplateBill's day-only due date storage (bare "16") to the
 * "*\/N" pattern that formatDueDateDisplay/dueDateSortKey/isBillDueBeforePayDate
 * expect — deliberately does NOT resolve a month here. Resolution has to happen
 * live at display/sort/past-due-check time (using the bill's own dueNextMonth
 * flag), not baked in once here, or toggling the flag later would go stale.
 * ASAP and any already-explicit value pass through unchanged.
 */
export function normalizeTemplateBillDueDate(dueDate: string): string {
  const trimmed = dueDate.trim()
  if (!trimmed) return ''
  if (/^\d{1,2}$/.test(trimmed)) return `*/${trimmed}`
  return trimmed
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
