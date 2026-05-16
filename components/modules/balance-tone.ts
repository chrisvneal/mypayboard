export type BalanceTone = 'healthy' | 'neutral' | 'danger'

export function getRemainingTone(amount: number): BalanceTone {
  if (amount > 0) return 'healthy'
  if (amount < 0) return 'danger'
  return 'neutral'
}

export function balanceToneClass(tone: BalanceTone): string {
  switch (tone) {
    case 'healthy':
      return 'balance-healthy'
    case 'neutral':
      return 'balance-neutral'
    default:
      return 'balance-danger'
  }
}
