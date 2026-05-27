'use client'

import {
  Banknote,
  Car,
  CreditCard,
  GraduationCap,
  Home,
  Landmark,
  ReceiptText,
} from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

type DebtTableRowProps = {
  entry: Creditor
  activeSortKey: string | null
}

const sortedColumnClass =
  'bg-[color-mix(in_srgb,var(--bg-tertiary)_48%,transparent)]'

function sortedCellClass(activeSortKey: string | null, key: string): string | undefined {
  return activeSortKey === key ? sortedColumnClass : undefined
}

function debtType(entry: Creditor): 'revolving' | 'installment' {
  return entry.debtDetail?.type ?? 'revolving'
}

function DebtItemIcon({ entry }: { entry: Creditor }) {
  const name = entry.name.toLowerCase()

  if (name.includes('mortgage')) return <Home className="size-4" />
  if (name.includes('student')) return <GraduationCap className="size-4" />
  if (name.includes('buick')) return <Car className="size-4" />
  if (debtType(entry) === 'installment') return <Banknote className="size-4" />
  if (name.includes('navy') || name.includes('boh') || name.includes('chase')) return <Landmark className="size-4" />
  if (debtType(entry) === 'revolving') return <CreditCard className="size-4" />
  return <ReceiptText className="size-4" />
}

function typeLabel(type: 'revolving' | 'installment'): string {
  return type === 'revolving' ? 'Revolving' : 'Installment'
}

function creditorDueDay(entry: Creditor): number | null {
  if (typeof entry.dueDay === 'number') return entry.dueDay
  const match = /\/(\d{1,2})$/.exec(entry.dueDatePattern)
  return match ? Number(match[1]) : null
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

function formatPromoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${Number(match[2])}/${Number(match[3])}/${match[1]}`
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
        'px-4 py-3 text-right text-[13px] tabular-nums',
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
    return <td className={cn('px-4 py-3 text-right text-[13px] text-(--text-tertiary)', className)}>—</td>
  }

  return (
    <td className={cn('px-4 py-3 text-right text-[13px] tabular-nums text-(--text-primary)', className)}>
      {formatCurrency(value)}
    </td>
  )
}

function AprCell({ entry, className }: { entry: Creditor; className?: string }) {
  const apr = entry.debtDetail?.apr
  if (typeof apr !== 'number') {
    return <td className={cn('px-4 py-3 text-right text-[13px] text-(--text-tertiary)', className)}>—</td>
  }

  return (
    <td className={cn('px-4 py-3 text-right text-[13px] tabular-nums text-(--text-primary)', className)}>
      <div>{formatPercent(apr)}</div>
      {entry.debtDetail?.promoEndDate ? (
        <div className="mt-0.5 text-[11px] font-normal tabular-nums text-(--text-tertiary)">
          Promo ends {formatPromoDate(entry.debtDetail.promoEndDate)}
        </div>
      ) : null}
    </td>
  )
}

export function DebtTableRow({ entry, activeSortKey }: DebtTableRowProps) {
  const detail = entry.debtDetail

  return (
    <tr
      className="transition duration-150 ease-out hover:bg-(--bg-secondary)"
      style={{ borderBottom: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
    >
      <td className={cn('px-4 py-3', sortedCellClass(activeSortKey, 'name'))}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <DebtItemIcon entry={entry} />
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-(--text-primary)">{entry.name}</span>
        </div>
      </td>
      <td className={cn('px-4 py-3 text-[12px] text-(--text-tertiary)', sortedCellClass(activeSortKey, 'type'))}>
        {typeLabel(debtType(entry))}
      </td>
      <AmountCell value={detail?.balanceOwed ?? 0} className={sortedCellClass(activeSortKey, 'balanceOwed')} />
      <AmountCell value={detail?.minMonthlyPayment ?? 0} className={sortedCellClass(activeSortKey, 'minMonthlyPayment')} />
      <OptionalCreditCell value={detail?.availableCredit} className={sortedCellClass(activeSortKey, 'availableCredit')} />
      <OptionalCreditCell value={detail?.creditLimit} className={sortedCellClass(activeSortKey, 'creditLimit')} />
      <AprCell entry={entry} className={sortedCellClass(activeSortKey, 'apr')} />
      <td className={cn('px-4 py-3 text-right text-[13px] tabular-nums text-(--text-secondary)', sortedCellClass(activeSortKey, 'dueDay'))}>
        {formatDueDay(entry)}
      </td>
    </tr>
  )
}
