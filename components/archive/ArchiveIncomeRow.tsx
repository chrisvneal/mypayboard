'use client'

import { useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, Check, PlusCircle, RotateCcw, Shield, Trash2, X } from 'lucide-react'
import type { Income } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type ArchiveIncomeRowProps = {
  income: Income
  isLast: boolean
  onRestore: () => void
  onDelete: () => void
}

function IncomeGroupIcon({ group }: { group: string }) {
  if (group.toLowerCase().includes('benefit')) return <Shield className="size-4" />
  if (group.toLowerCase().includes('job')) return <BriefcaseBusiness className="size-4" />
  return <PlusCircle className="size-4" />
}

function frequencyLabel(frequency: Income['frequency']): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly'
    case 'biweekly':
      return 'Biweekly'
    case 'monthly':
      return 'Monthly'
    case '15th-30th':
      return '15th & 30th'
    case 'yearly':
      return 'Yearly'
    default:
      return frequency
  }
}

function ownerLabel(owner: Income['owner']): string {
  if (owner === 'chris') return 'Chris'
  if (owner === 'nicole') return 'Nicole'
  return 'Shared'
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

export function ArchiveIncomeRow({ income, isLast, onRestore, onDelete }: ArchiveIncomeRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

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
      <div className="grid items-center gap-x-3 px-4 py-2.5 transition duration-150 ease-out hover:bg-(--bg-secondary) grid-cols-[1fr_auto_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <IncomeGroupIcon group={income.group} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="min-w-0 truncate text-[13px] font-medium text-(--text-secondary)">{income.name}</span>
            <span className="text-[11px] text-(--text-tertiary)">
              {ownerLabel(income.owner)} · {frequencyLabel(income.frequency)} · {archivedDateLabel(income.archivedAt)}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right text-[13px] font-normal tabular-nums text-(--text-secondary)">
          {formatCurrency(income.amount)}
        </div>

        <div ref={actionsRef} className="flex shrink-0 items-center justify-end gap-1">
          {!confirmingDelete && (
            <button
              type="button"
              onClick={onRestore}
              className="group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-secondary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--navy)"
              aria-label={`Restore ${income.name}`}
            >
              <RotateCcw className="size-4" />
              <ActionTooltip label="Restore" />
            </button>
          )}
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--danger) transition duration-150 ease-out hover:bg-red-50 dark:hover:bg-red-950/25"
                aria-label={`Confirm delete ${income.name}`}
              >
                <Check className="size-4" />
                <ActionTooltip label="Confirm delete" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-tertiary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--text-secondary)"
                aria-label="Cancel delete"
              >
                <X className="size-4" />
                <ActionTooltip label="Cancel" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-tertiary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--danger)"
              aria-label={`Delete ${income.name} permanently`}
            >
              <Trash2 className="size-4" />
              <ActionTooltip label="Delete permanently" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
