import type { Income } from './types'

export function monthlyIncomeAmount(income: Income): number {
  switch (income.frequency) {
    case 'weekly':
      return income.amount * 4
    case 'biweekly':
    case '15th-30th':
      return income.amount * 2
    case 'monthly':
    case 'custom':
    default:
      return income.amount
  }
}
