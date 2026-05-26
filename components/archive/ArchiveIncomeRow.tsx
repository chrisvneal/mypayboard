'use client'

import { useState } from 'react'
import { BriefcaseBusiness, PlusCircle, Shield } from 'lucide-react'
import type { Income } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type ArchiveIncomeRowProps = {
  income: Income
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

export function ArchiveIncomeRow({ income, onRestore, onDelete }: ArchiveIncomeRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <div className="group/archive-row border-b border-[--module-divider-color] last:border-b-0">
      <div className="grid items-center gap-3 px-4 py-2 transition duration-150 ease-out hover:bg-(--bg-secondary) md:grid-cols-[minmax(0,1fr)_104px_86px_104px_116px]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <IncomeGroupIcon group={income.group} />
          </span>
          <div className="min-w-0 truncate text-[13px] font-medium text-(--text-secondary)">
            {income.name}
          </div>
        </div>

        <div className="text-[13px] text-(--text-tertiary)">{frequencyLabel(income.frequency)}</div>
        <div className="text-[12px] text-(--text-tertiary) md:text-right">{ownerLabel(income.owner)}</div>
        <div className="text-left text-[13px] font-normal tabular-nums text-(--text-secondary) md:text-right">
          {formatCurrency(income.amount)}
        </div>

        <div className="flex items-center gap-3 md:justify-end">
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
