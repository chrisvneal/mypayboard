'use client'

import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type DebtTableFooterProps = {
  balanceOwed: number
  minMonthlyPayment: number
  availableCredit: number
  creditLimit: number
  showCreditTotals: boolean
}

function totalCell(value: string, className?: string) {
  return (
    <td className={cn('px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-(--text-primary)', className)}>
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
}: DebtTableFooterProps) {
  const creditTotal = (value: number) => (showCreditTotals ? formatCurrency(value) : '—')

  return (
    <tfoot>
      <tr
        className="bg-(--bg-primary)"
        style={{ borderTop: '1px solid var(--color-border-secondary, var(--border-strong))' }}
      >
        <td className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-(--text-tertiary)">
          TOTALS
        </td>
        <td className="px-4 py-3" />
        {totalCell(formatCurrency(balanceOwed))}
        {totalCell(formatCurrency(minMonthlyPayment))}
        {totalCell(creditTotal(availableCredit), showCreditTotals ? undefined : 'text-(--text-tertiary)')}
        {totalCell(creditTotal(creditLimit), showCreditTotals ? undefined : 'text-(--text-tertiary)')}
        <td className="px-4 py-3" />
        <td className="px-4 py-3" />
      </tr>
    </tfoot>
  )
}
