/** Normalize stored pay date to YYYY-MM-DD for date inputs (local calendar, no UTC shift). */
export function payDateToIso(dateStr: string): string {
  if (!dateStr) return ''
  const trimmed = dateStr.trim()

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed)
  if (iso) {
    const y = iso[1]
    const m = String(Number(iso[2])).padStart(2, '0')
    const d = String(Number(iso[3])).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  if (/[a-zA-Z]{3,}/.test(trimmed) && trimmed.includes(',')) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  return ''
}

/** Local-calendar timestamp for sorting pay dates without UTC day-shift. */
export function payDateSortTime(dateStr: string, fallback: number): number {
  if (!dateStr) return fallback
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr.trim())
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2]) - 1
    const d = Number(iso[3])
    return new Date(y, m, d).getTime()
  }
  const parsed = new Date(dateStr).getTime()
  return Number.isNaN(parsed) ? fallback : parsed
}
