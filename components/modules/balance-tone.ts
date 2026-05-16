export type BalanceTone = 'healthy' | 'warning' | 'danger'

export function getRemainingTone(amount: number): BalanceTone {
  if (amount > 500) return 'healthy'
  if (amount >= 1) return 'warning'
  return 'danger'
}

export function balanceToneClass(tone: BalanceTone): string {
  switch (tone) {
    case 'healthy':
      return 'balance-healthy'
    case 'warning':
      return 'balance-warning'
    default:
      return 'balance-danger'
  }
}
