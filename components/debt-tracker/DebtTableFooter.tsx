'use client'

import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

type DebtTableFooterProps = {
  balanceOwed: number
  minMonthlyPayment: number
  availableCredit: number
  creditLimit: number
  showCreditTotals: boolean
  activeSortKey: string | null
}

const sortedColumnClass =
  'bg-[color-mix(in_srgb,var(--bg-tertiary)_48%,transparent)]'

function sortedCellClass(activeSortKey: string | null, key: string): string | undefined {
  return activeSortKey === key ? cn(sortedColumnClass, 'font-semibold') : undefined
}

function totalCell(value: string, activeSortKey: string | null, key: string, className?: string) {
  return (
    <td
      className={cn(
        'font-financial px-4 py-3 text-center text-base font-medium text-(--text-primary)',
        sortedCellClass(activeSortKey, key),
        className
      )}
    >
      {value}
    </td>
  )
}

export function DebtTableFooter({
  balanceOwed,
  minMonthlyPayment,
  availableCredit,
  creditLimit,
  showCreditTotals,
  activeSortKey,
}: DebtTableFooterProps) {
  const creditTotal = (value: number) => (showCreditTotals ? formatCurrency(value) : '—')

  return (
    <tfoot>
      <tr
        className="bg-(--bg-primary)"
        style={{ borderTop: '1px solid var(--color-border-secondary, var(--border-strong))' }}
      >
        <td className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--text-secondary)', sortedCellClass(activeSortKey, 'name'))}>
          TOTALS
        </td>
        <td className={cn('px-4 py-3', sortedCellClass(activeSortKey, 'type'))} />
        {totalCell(formatCurrency(balanceOwed), activeSortKey, 'balanceOwed')}
        {totalCell(formatCurrency(minMonthlyPayment), activeSortKey, 'minMonthlyPayment')}
        {totalCell(creditTotal(availableCredit), activeSortKey, 'availableCredit', showCreditTotals ? undefined : 'text-(--text-tertiary)')}
        {totalCell(creditTotal(creditLimit), activeSortKey, 'creditLimit', showCreditTotals ? undefined : 'text-(--text-tertiary)')}
        <td className={cn('px-4 py-3', sortedCellClass(activeSortKey, 'apr'))} />
        <td className={cn('px-4 py-3', sortedCellClass(activeSortKey, 'dueDay'))} />
      </tr>
    </tfoot>
  )
}
