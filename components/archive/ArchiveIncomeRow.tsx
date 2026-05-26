'use client'

import { useState } from 'react'
import { BriefcaseBusiness, PlusCircle, RotateCcw, Shield, Trash2 } from 'lucide-react'
import type { Income } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/useMyPayBoard'
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
    case 'custom':
    default:
      return 'Custom'
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

  return (
    <div
      className="group/archive-row"
      style={{
        borderBottom: isLast ? '0' : '0.5px solid var(--color-border-tertiary, var(--module-divider-color))',
      }}
    >
      <div className="grid items-center gap-x-4 gap-y-2 px-4 py-2.5 transition duration-150 ease-out hover:bg-(--bg-secondary) lg:grid-cols-[minmax(220px,1fr)_104px_86px_minmax(150px,0.45fr)_104px_72px]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <IncomeGroupIcon group={income.group} />
          </span>
          <div className="min-w-0 truncate text-[13px] font-medium text-(--text-secondary)">
            {income.name}
          </div>
        </div>

        <div className="text-[13px] text-(--text-tertiary)">{frequencyLabel(income.frequency)}</div>
        <div className="text-[12px] text-(--text-tertiary) lg:text-right">{ownerLabel(income.owner)}</div>
        <div className="text-[12px] text-(--text-tertiary)">
          {archivedDateLabel(income.archivedAt)}
        </div>
        <div className="text-left text-[13px] font-normal tabular-nums text-(--text-secondary) lg:text-right">
          {formatCurrency(income.amount)}
        </div>

        <div className="flex items-center gap-1 lg:justify-end">
          <button
            type="button"
            onClick={onRestore}
            className="group/action relative inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-secondary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--navy)"
            aria-label={`Restore ${income.name}`}
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
            aria-label={`Delete ${income.name} permanently`}
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
