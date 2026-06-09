import { isNoteUnread } from './note-read-state'
import type { PayDateCard } from './types'

/** Sum of bill amounts that count toward this pay period (non-muted). */
export function getModuleSpent(card: PayDateCard): number {
  return card.bills.filter(b => !b.muted).reduce((sum, b) => sum + b.amount, 0)
}

/** Pay amount minus non-muted bill total — single source for module footer "Remaining". */
export function getModuleRemaining(card: PayDateCard): number {
  return (card.payAmount ?? 0) - getModuleSpent(card)
}

export function getModuleMutedStats(card: PayDateCard): {
  mutedCount: number
  mutedTotal: number
} {
  const mutedBills = card.bills.filter(b => b.muted)
  return {
    mutedCount: mutedBills.length,
    mutedTotal: mutedBills.reduce((sum, b) => sum + b.amount, 0),
  }
}

export function getModuleUnreadNoteCount(
  card: PayDateCard,
  userId: string,
  readNoteIds: ReadonlySet<string> | readonly string[]
): number {
  return card.notes.filter(n => isNoteUnread(n, userId, readNoteIds)).length
}

export function getModuleFooterStats(
  card: PayDateCard,
  currentUserId: string,
  readNoteIds: ReadonlySet<string> | readonly string[]
) {
  const { mutedCount, mutedTotal } = getModuleMutedStats(card)
  return {
    totalExpenses: getModuleSpent(card),
    remaining: getModuleRemaining(card),
    mutedCount,
    mutedTotal,
    unreadCount: getModuleUnreadNoteCount(card, currentUserId, readNoteIds),
  }
}

export function getModulePaidTotal(card: PayDateCard): number {
  return card.bills.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0)
}

export function getModuleUnpaidTotal(card: PayDateCard): number {
  return card.bills.filter(b => !b.paid && !b.muted).reduce((sum, b) => sum + b.amount, 0)
}
