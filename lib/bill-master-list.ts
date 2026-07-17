import type { Bill, Creditor } from './types'

function normalizeBillName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Match a one-off bill to a creditor created via "Save to Master" when the
 * bill row was not updated (e.g. creditor insert won the race but bill FK failed).
 */
export function findPromotedCreditorMatch(
  bill: Bill,
  creditors: Creditor[]
): Creditor | undefined {
  if (!bill.name.trim()) return undefined
  const name = normalizeBillName(bill.name)
  return creditors.find(
    c => !c.archived && normalizeBillName(c.name) === name && c.defaultAmount === bill.amount
  )
}

/** True when this board bill is already represented on the master list. */
export function billIsOnMasterList(bill: Bill, creditors: Creditor[] = []): boolean {
  if (bill.promotedToMaster) return true
  if (bill.origin === 'master') return true
  if (bill.creditorId && creditors.some(c => c.id === bill.creditorId && !c.archived)) {
    return true
  }
  return findPromotedCreditorMatch(bill, creditors) !== undefined
}

export function shouldShowSaveToMaster(bill: Bill, creditors: Creditor[] = []): boolean {
  return bill.origin === 'oneoff' && !billIsOnMasterList(bill, creditors)
}
