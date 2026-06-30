import type { Bill, Creditor } from './types'

/**
 * Resolve the display name for a bill.
 *
 * Priority:
 *   1. bill.nameOverride — user explicitly renamed this card bill
 *   2. live creditor name — master list rename propagates automatically
 *   3. bill.name — fallback (oneoff bills, or creditor not found)
 */
export function resolveBillDisplayName(
  bill: Bill,
  creditors: Creditor[]
): string {
  if (bill.nameOverride) return bill.nameOverride
  if (bill.creditorId) {
    const creditor = creditors.find(c => c.id === bill.creditorId)
    if (creditor) return creditor.name
  }
  return bill.name
}

/**
 * Returns the live Creditor for a master-list bill, or undefined.
 */
export function resolveBillCreditor(
  bill: Bill,
  creditors: Creditor[]
): Creditor | undefined {
  if (!bill.creditorId) return undefined
  return creditors.find(c => c.id === bill.creditorId)
}
