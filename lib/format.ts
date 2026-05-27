export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr.trim())
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2]) - 1
    const day = Number(iso[3])
    return new Date(y, m, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
