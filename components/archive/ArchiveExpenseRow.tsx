'use client'

import { useState } from 'react'
import {
  Banknote,
  Car,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Home,
  Landmark,
  PiggyBank,
  ReceiptText,
  RotateCcw,
  Smartphone,
  Trash2,
  Tv,
  Warehouse,
  Wifi,
  Zap,
} from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type ArchiveExpenseRowProps = {
  creditor: Creditor
  categoryLabel: string
  isLast: boolean
  onRestore: () => void
  onDelete: () => void
}

function ExpenseItemIcon({ creditor, category }: { creditor: Creditor; category: string }) {
  const name = creditor.name.toLowerCase()
  const tags = creditor.tags.join(' ').toLowerCase()
  const normalizedCategory = category.toLowerCase()
  const searchable = `${name} ${tags} ${normalizedCategory}`

  if (searchable.includes('mortgage') || searchable.includes('hoa')) return <Home className="size-4" />
  if (searchable.includes('student') || searchable.includes('nelnet') || searchable.includes('school')) {
    return <GraduationCap className="size-4" />
  }
  if (searchable.includes('storage')) return <Warehouse className="size-4" />
  if (searchable.includes('mobile') || searchable.includes('phone')) return <Smartphone className="size-4" />
  if (searchable.includes('buick') || searchable.includes('auto') || searchable.includes('onstar')) {
    return <Car className="size-4" />
  }
  if (searchable.includes('spectrum') || searchable.includes('internet')) return <Wifi className="size-4" />
  if (searchable.includes('heco') || searchable.includes('electric')) return <Zap className="size-4" />
  if (searchable.includes('gym') || searchable.includes('fitness')) return <Dumbbell className="size-4" />
  if (searchable.includes('youtube') || searchable.includes('disney') || searchable.includes('hulu') || searchable.includes('streaming')) {
    return <Tv className="size-4" />
  }
  if (searchable.includes('pet')) return <ReceiptText className="size-4" />
  if (searchable.includes('ira') || searchable.includes('hysa') || searchable.includes('savings')) {
    return <PiggyBank className="size-4" />
  }
  if (searchable.includes('stock') || searchable.includes('invest')) return <Landmark className="size-4" />
  if (searchable.includes('loan')) return <Banknote className="size-4" />
  if (normalizedCategory.includes('credit')) return <CreditCard className="size-4" />
  if (normalizedCategory.includes('subscription')) return <Tv className="size-4" />
  if (normalizedCategory.includes('saving')) return <PiggyBank className="size-4" />
  return <ReceiptText className="size-4" />
}

function accountLastFourValues(creditor: Creditor): string[] {
  return Array.from(
    new Set([...(creditor.accountLastFours ?? []), creditor.accountLastFour]
      .map(value => value?.replace(/\D/g, '').slice(-4))
      .filter((value): value is string => Boolean(value)))
  )
}

function archivedDateLabel(archivedAt?: string): string {
  return archivedAt ? `Archived ${formatDate(archivedAt)}` : 'Archived —'
}

function ActionTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-2 py-1 text-[11px] font-medium text-(--text-secondary) opacity-0 shadow-(--shadow-sm) transition-opacity delay-300 duration-150 ease-out group-hover/action:opacity-100 group-focus-visible/action:opacity-100">
      {label}
    </span>
  )
}

export function ArchiveExpenseRow({
  creditor,
  categoryLabel,
  isLast,
  onRestore,
  onDelete,
}: ArchiveExpenseRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const accountDigits = accountLastFourValues(creditor)

  return (
    <div
      className={cn(
        'group/archive-row transition-[margin] duration-150 ease-out',
        confirmingDelete && !isLast && 'mb-3'
      )}
      style={{
        borderBottom: isLast ? '0' : '0.5px solid var(--color-border-tertiary, var(--module-divider-color))',
      }}
    >
      <div className="grid items-center gap-x-4 gap-y-2 px-4 py-2.5 transition duration-150 ease-out hover:bg-(--bg-secondary) lg:grid-cols-[minmax(240px,1fr)_minmax(116px,0.35fr)_minmax(150px,0.45fr)_104px_72px]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <ExpenseItemIcon creditor={creditor} category={categoryLabel} />
          </span>
          <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-(--text-secondary)">
            <span className="min-w-0 truncate">{creditor.name}</span>
            {accountDigits.map(digits => (
              <span
                key={digits}
                className="shrink-0 rounded-md bg-(--bg-secondary) px-2 py-0.5 text-xs font-normal tracking-wide text-(--text-tertiary)"
              >
                •••• {digits}
              </span>
            ))}
          </div>
        </div>

        <div className="w-fit rounded-md bg-(--bg-secondary) px-2 py-0.5 text-[11px] font-medium text-(--text-tertiary)">
          {categoryLabel}
        </div>

        <div className="text-[12px] text-(--text-tertiary)">
          {archivedDateLabel(creditor.archivedAt)}
        </div>

        <div className="text-left text-[13px] font-normal tabular-nums text-(--text-secondary) lg:text-right">
          {formatCurrency(creditor.defaultAmount)}
        </div>

        <div className="flex items-center gap-1 lg:justify-end">
          <button
            type="button"
            onClick={onRestore}
            className="group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-secondary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--navy)"
            aria-label={`Restore ${creditor.name}`}
          >
            <RotateCcw className="size-4" />
            <ActionTooltip label="Restore" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={cn(
              'group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-tertiary) opacity-0 transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--danger) hover:opacity-100 focus:opacity-100 group-hover/archive-row:opacity-100',
              confirmingDelete && 'opacity-100'
            )}
            aria-label={`Delete ${creditor.name} permanently`}
          >
            <Trash2 className="size-4" />
            <ActionTooltip label="Delete permanently" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-150 ease-out',
          confirmingDelete ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] bg-(--bg-secondary) px-4 py-3 text-[12px] text-(--text-secondary)">
            <span>Permanently delete this item? This cannot be undone.</span>
            <button
              type="button"
              onClick={onDelete}
              className="cursor-pointer rounded-md bg-red-50 px-2.5 py-1 font-medium text-(--danger-muted) transition duration-150 ease-out hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/40"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="cursor-pointer font-medium text-(--text-tertiary) transition duration-150 ease-out hover:text-(--text-secondary)"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
