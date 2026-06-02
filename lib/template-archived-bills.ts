import { findCreditorForTemplateBill, resolveCreditorId } from './template-utils'
import type { Bill, Creditor } from './types'

export function isBillArchivedInMasterList(bill: Bill, creditors: Creditor[]): boolean {
  const masterId = bill.creditorId ?? bill.id
  const creditor = findCreditorForTemplateBill(creditors, resolveCreditorId(masterId))
  if (!creditor) return false
  return creditor.archived || creditor.active === false
}
