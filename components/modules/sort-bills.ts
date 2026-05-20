import type { Bill } from '@/lib/types'
import { dueDateSortKey } from '@/lib/due-date'
import type { BillSortDirection, BillSortKey } from './ModuleBillTableHeader'

export function sortBills(
  bills: Bill[],
  sortKey: BillSortKey | null,
  sortDirection: BillSortDirection,
  boardMonth: number
): Bill[] {
  if (!sortKey) return bills
  return [...bills].sort((a, z) => {
    let result = 0
    if (sortKey === 'name') result = a.name.localeCompare(z.name)
    else if (sortKey === 'amount') result = a.amount - z.amount
    else result = dueDateSortKey(a.dueDate, boardMonth).localeCompare(dueDateSortKey(z.dueDate, boardMonth))
    return sortDirection === 'asc' ? result : -result
  })
}
