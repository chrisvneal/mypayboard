'use client'

import { creditorDueDay, debtMinimumPayment } from '@/lib/creditors'
import { resolveIcon } from '@/lib/icons'
import type { Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

type DebtTableRowProps = {
  entry: Creditor
  activeSortKey: string | null
}

const sortedColumnClass =
  'bg-[color-mix(in_srgb,var(--bg-tertiary)_48%,transparent)] border-b border-(--border-strong)'

function sortedCellClass(activeSortKey: string | null, key: string): string | undefined {
  return activeSortKey === key ? sortedColumnClass : undefined
}

function debtType(entry: Creditor): 'revolving' | 'installment' {
  return entry.debtDetail?.type ?? 'revolving'
}

function DebtItemIcon({ entry }: { entry: Creditor }) {
  const { Icon } = resolveIcon(entry.icon, entry.category)
  return <Icon className="size-4" />
}

function typeLabel(type: 'revolving' | 'installment'): string {
  return type === 'revolving' ? 'Revolving' : 'Installment'
}

function ordinalDay(day: number): string {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`

  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

function formatDueDay(entry: Creditor): string {
  if (entry.dueDay === 'varies' || entry.dueDatePattern.toLowerCase() === 'varies') return 'Varies'
  if (entry.dueDay === 'asap' || entry.dueDatePattern.toUpperCase() === 'ASAP') return 'ASAP'

  const dueDay = creditorDueDay(entry)
  return dueDay ? ordinalDay(dueDay) : '—'
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

function AmountCell({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  return (
    <td
      className={cn(
        'font-financial px-4 py-3 text-center text-[13px]',
        value === 0 ? 'text-(--text-tertiary)' : 'text-(--text-primary)',
        className
      )}
    >
      {formatCurrency(value)}
    </td>
  )
}

function OptionalCreditCell({ value, className }: { value?: number; className?: string }) {
  if (typeof value !== 'number') {
    return <td className={cn('px-4 py-3 text-center text-[13px] text-(--text-tertiary)', className)}>—</td>
  }

  return (
    <td className={cn('font-financial px-4 py-3 text-center text-[13px] text-(--text-primary)', className)}>
      {formatCurrency(value)}
    </td>
  )
}

function AprCell({ entry, className }: { entry: Creditor; className?: string }) {
  const apr = entry.debtDetail?.apr
  if (typeof apr !== 'number') {
    return <td className={cn('px-4 py-3 text-center text-[13px] text-(--text-tertiary)', className)}>—</td>
  }

  return (
    <td className={cn('font-financial px-4 py-3 text-center text-[13px] text-(--text-primary)', className)}>
      {formatPercent(apr)}
    </td>
  )
}

export function DebtTableRow({ entry, activeSortKey }: DebtTableRowProps) {
  const detail = entry.debtDetail

  return (
    <tr
      className="group h-[58px] transition duration-150 ease-out hover:bg-(--bg-secondary)"
      style={{ borderBottom: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
    >
      {/* Sticky name cell — opaque bg masks scrolling columns; group-hover syncs with row hover */}
      <td className={cn(
        'sticky left-0 z-1 px-4 py-3 transition-colors duration-150',
        activeSortKey === 'name'
          ? 'border-b border-(--border-strong) bg-[color-mix(in_srgb,var(--bg-tertiary)_48%,var(--bg-primary))] group-hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_48%,var(--bg-secondary))]'
          : 'bg-(--bg-primary) group-hover:bg-(--bg-secondary)'
      )}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <DebtItemIcon entry={entry} />
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-(--text-primary)">{entry.name}</span>
        </div>
      </td>
      <td className={cn('px-4 py-3 text-center text-[12px] text-(--text-tertiary)', sortedCellClass(activeSortKey, 'type'))}>
        {typeLabel(debtType(entry))}
      </td>
      <AmountCell value={detail?.balanceOwed ?? 0} className={sortedCellClass(activeSortKey, 'balanceOwed')} />
      <AmountCell value={debtMinimumPayment(entry)} className={sortedCellClass(activeSortKey, 'minMonthlyPayment')} />
      <OptionalCreditCell value={detail?.availableCredit} className={sortedCellClass(activeSortKey, 'availableCredit')} />
      <OptionalCreditCell value={detail?.creditLimit} className={sortedCellClass(activeSortKey, 'creditLimit')} />
      <AprCell entry={entry} className={sortedCellClass(activeSortKey, 'apr')} />
      <td className={cn('px-4 py-3 text-center text-[13px] tabular-nums text-(--text-secondary)', sortedCellClass(activeSortKey, 'dueDay'))}>
        {formatDueDay(entry)}
      </td>
    </tr>
  )
}
