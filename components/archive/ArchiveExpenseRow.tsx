'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Banknote,
  Car,
  Check,
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
import { formatCurrency, formatDate } from '@/lib/format'

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


export function ArchiveExpenseRow({
  creditor,
  categoryLabel,
  isLast,
  onRestore,
  onDelete,
}: ArchiveExpenseRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const accountDigits = accountLastFourValues(creditor)

  useEffect(() => {
    if (!confirmingDelete) return
    function handlePointerDown(e: PointerEvent) {
      if (actionsRef.current?.contains(e.target as Node)) return
      setConfirmingDelete(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [confirmingDelete])

  return (
    <div
      className="group/archive-row"
      style={{
        borderBottom: isLast ? '0' : '0.5px solid var(--color-border-tertiary, var(--module-divider-color))',
      }}
    >
      <div className="grid items-center gap-x-3 px-4 py-2.5 transition duration-150 ease-out hover:bg-(--bg-secondary) grid-cols-[1fr_auto_auto_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <ExpenseItemIcon creditor={creditor} category={categoryLabel} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 truncate text-[13px] font-medium text-(--text-secondary)">{creditor.name}</span>
              {accountDigits.map(digits => (
                <span
                  key={digits}
                  className="shrink-0 rounded-md bg-(--bg-secondary) px-2 py-0.5 text-xs font-normal tracking-wide text-(--text-tertiary)"
                >
                  •••• {digits}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-(--text-tertiary)">{archivedDateLabel(creditor.archivedAt)}</span>
          </div>
        </div>

        <div className="shrink-0 rounded-md bg-(--bg-secondary) px-2 py-0.5 text-[11px] font-medium text-(--text-tertiary)">
          {categoryLabel}
        </div>

        <div className="shrink-0 text-right text-[13px] font-normal tabular-nums text-(--text-secondary)">
          {formatCurrency(creditor.defaultAmount)}
        </div>

        <div ref={actionsRef} className="flex shrink-0 items-center justify-end gap-1" onPointerLeave={() => setConfirmingDelete(false)}>
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-secondary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--navy)"
            aria-label={`Restore ${creditor.name}`}
          >
            <RotateCcw className="size-4" />
          </button>
          {confirmingDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--danger) transition duration-150 ease-out hover:bg-(--bg-secondary)"
              aria-label={`Confirm delete ${creditor.name}`}
            >
              <Check className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-tertiary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--danger)"
              aria-label={`Delete ${creditor.name} permanently`}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
