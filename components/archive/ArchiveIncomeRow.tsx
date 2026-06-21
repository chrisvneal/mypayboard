'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw, Trash2 } from 'lucide-react'
import type { Income } from '@/lib/types'
import { resolveIcon } from '@/lib/icons'
import { formatCurrency, formatDate } from '@/lib/format'

type ArchiveIncomeRowProps = {
  income: Income
  isLast: boolean
  onRestore: () => void
  onDelete: () => void
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


export function ArchiveIncomeRow({ income, isLast, onRestore, onDelete }: ArchiveIncomeRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { Icon: IncomeIcon } = resolveIcon(income.icon, income.group)

  useEffect(() => {
    if (!confirmingDelete) return
    function handlePointerDown(e: PointerEvent) {
      if (actionsRef.current?.contains(e.target as Node)) return
      setConfirmingDelete(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [confirmingDelete])

  useEffect(() => {
    return () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }
  }, [])

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
            <IncomeIcon className="size-4" />
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

        <div ref={actionsRef} className="flex shrink-0 items-center justify-end gap-1" onPointerEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }} onPointerLeave={() => { leaveTimer.current = setTimeout(() => setConfirmingDelete(false), 600) }}>
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-secondary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--navy)"
            aria-label={`Restore ${income.name}`}
          >
            <RotateCcw className="size-4" />
          </button>
          {confirmingDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--danger) transition duration-150 ease-out hover:bg-(--bg-secondary)"
              aria-label={`Confirm delete ${income.name}`}
            >
              <Check className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-(--text-tertiary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--danger)"
              aria-label={`Delete ${income.name} permanently`}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
