import type { PayDateModule } from './types'

/** Sum of bill amounts that count toward this pay period (non-muted). */
export function getModuleSpent(module: PayDateModule): number {
  return module.bills.filter(b => !b.muted).reduce((sum, b) => sum + b.amount, 0)
}

/** Pay amount minus non-muted bill total — single source for module footer "Remaining". */
export function getModuleRemaining(module: PayDateModule): number {
  return (module.payAmount ?? 0) - getModuleSpent(module)
}

export function getModuleMutedStats(module: PayDateModule): {
  mutedCount: number
  mutedTotal: number
} {
  const mutedBills = module.bills.filter(b => b.muted)
  return {
    mutedCount: mutedBills.length,
    mutedTotal: mutedBills.reduce((sum, b) => sum + b.amount, 0),
  }
}

export function getModuleUnreadNoteCount(module: PayDateModule, userId: string): number {
  return module.notes.filter(n => n.unread && n.authorId !== userId).length
}

export function getModuleFooterStats(module: PayDateModule, currentUserId: string) {
  const { mutedCount, mutedTotal } = getModuleMutedStats(module)
  return {
    totalExpenses: getModuleSpent(module),
    remaining: getModuleRemaining(module),
    mutedCount,
    mutedTotal,
    unreadCount: getModuleUnreadNoteCount(module, currentUserId),
  }
}

export function getModulePaidTotal(module: PayDateModule): number {
  return module.bills.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0)
}

export function getModuleUnpaidTotal(module: PayDateModule): number {
  return module.bills.filter(b => !b.paid && !b.muted).reduce((sum, b) => sum + b.amount, 0)
}
