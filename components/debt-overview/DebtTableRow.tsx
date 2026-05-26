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
import { formatCurrency } from '@/lib/useMyPayBoard'

type DebtTableRowProps = {
  entry: Creditor
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

function formatDueDay(entry: Creditor): string {
  const dueDay = creditorDueDay(entry)
  return dueDay ? `*/${dueDay}` : '—'
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

function OptionalCreditCell({ value }: { value?: number }) {
  if (typeof value !== 'number') {
    return <td className="px-4 py-3 text-right text-[13px] text-(--text-tertiary)">—</td>
  }

  return (
    <td className="px-4 py-3 text-right text-[13px] tabular-nums text-(--text-primary)">
      {formatCurrency(value)}
    </td>
  )
}

function AprCell({ entry }: { entry: Creditor }) {
  const apr = entry.debtDetail?.apr
  if (typeof apr !== 'number') {
    return <td className="px-4 py-3 text-right text-[13px] text-(--text-tertiary)">—</td>
  }

  return (
    <td className="px-4 py-3 text-right text-[13px] tabular-nums text-(--text-primary)">
      <div>{formatPercent(apr)}</div>
      {entry.debtDetail?.promoEndDate ? (
        <div className="mt-0.5 text-[11px] font-normal tabular-nums text-(--text-tertiary)">
          Promo ends {formatPromoDate(entry.debtDetail.promoEndDate)}
        </div>
      ) : null}
    </td>
  )
}

export function DebtTableRow({ entry }: DebtTableRowProps) {
  const detail = entry.debtDetail

  return (
    <tr
      className="transition duration-150 ease-out hover:bg-(--bg-secondary)"
      style={{ borderBottom: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
    >
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <DebtItemIcon entry={entry} />
          </span>
          <span className="min-w-0 truncate text-[13px] font-medium text-(--text-primary)">{entry.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-[12px] text-(--text-tertiary)">{typeLabel(debtType(entry))}</td>
      <AmountCell value={detail?.balanceOwed ?? 0} />
      <AmountCell value={detail?.minMonthlyPayment ?? 0} />
      <OptionalCreditCell value={detail?.availableCredit} />
      <OptionalCreditCell value={detail?.creditLimit} />
      <AprCell entry={entry} />
      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-(--text-secondary)">
        {formatDueDay(entry)}
      </td>
    </tr>
  )
}
