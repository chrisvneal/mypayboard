import { findCreditorForTemplateBill, resolveCreditorId } from './template-utils'
import type { Bill, Creditor } from './types'

export const ARCHIVED_BILL_REVIEW_MESSAGE =
  'This bill has been archived in the Master List and should be reviewed.'

/** Resolve the master-list id used when this template bill was saved (via creditorId). */
export function masterListIdForTemplateBill(bill: Bill): string {
  const raw = bill.creditorId ?? bill.id
  return resolveCreditorId(raw)
}

/**
 * True when the bill's master-list entry is archived or inactive.
 * Used in the template editor on load and after Refresh from Master List.
 */
export function isBillArchivedInMasterList(bill: Bill, creditors: Creditor[]): boolean {
  if (bill.origin !== 'master' && !bill.creditorId) return false

  const masterListId = masterListIdForTemplateBill(bill)
  const creditor = findCreditorForTemplateBill(creditors, masterListId)
  if (!creditor) return false

  return creditor.archived || creditor.active === false
}
