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
