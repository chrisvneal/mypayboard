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
  Smartphone,
  Tv,
  Warehouse,
  Wifi,
  Zap,
} from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type ArchiveExpenseRowProps = {
  creditor: Creditor
  categoryLabel: string
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

export function ArchiveExpenseRow({
  creditor,
  categoryLabel,
  onRestore,
  onDelete,
}: ArchiveExpenseRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const accountDigits = accountLastFourValues(creditor)

  return (
    <div className="group/archive-row border-b border-[--module-divider-color] last:border-b-0">
      <div className="grid items-center gap-3 px-4 py-2 transition duration-150 ease-out hover:bg-(--bg-secondary) sm:grid-cols-[minmax(0,1fr)_104px_116px]">
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

        <div className="text-left text-[13px] font-normal tabular-nums text-(--text-secondary) sm:text-right">
          {formatCurrency(creditor.defaultAmount)}
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onRestore}
            className="cursor-pointer text-[12px] font-medium text-(--navy) transition duration-150 ease-out hover:text-(--navy-dark)"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={cn(
              'cursor-pointer text-[12px] font-medium text-(--danger-muted) opacity-0 transition duration-150 ease-out hover:opacity-100 focus:opacity-100 group-hover/archive-row:opacity-100',
              confirmingDelete && 'opacity-100'
            )}
          >
            Delete
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
              Confirm delete
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
