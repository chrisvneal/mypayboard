import { formatCurrency } from '@/lib/format'

export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Format raw typed currency on blur/enter; empty stays empty. */
export function formatMoneyInputDraft(raw: string): string {
  const n = parseMoneyInput(raw)
  if (n !== null) return formatCurrency(n)
  return ''
}
