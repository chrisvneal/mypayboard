/** Parse yyyy-mm-dd as a local calendar date (no UTC day-shift). */
export function isoToLocalDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(iso.trim())
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  if (!year || month < 0 || month > 11 || !day) return undefined

  return new Date(year, month, day)
}

/** Format a local calendar date to yyyy-mm-dd. */
export function localDateToIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
