'use client'

import { useEffect, useRef } from 'react'
import { BriefcaseBusiness, Pencil, PlusCircle, Shield } from 'lucide-react'
import type { Income } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { IncomeEditForm } from './IncomeEditForm'

type IncomeRowProps = {
  income: Income
  groupLabel: string
  isEditing: boolean
  onEditStart: () => void
  onCancelEdit: () => void
  onSave: (changes: Partial<Income>) => void
  onArchive: () => void
  onDelete: () => void
  variant?: 'grouped' | 'list'
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

export function IncomeRow({
  income,
  groupLabel,
  isEditing,
  onEditStart,
  onCancelEdit,
  onSave,
  onArchive,
  onDelete,
  variant = 'grouped',
}: IncomeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEditing) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node
      if (rowRef.current?.contains(target)) return
      onCancelEdit()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isEditing, onCancelEdit])

  const saveAndClose = (changes: Partial<Income>) => {
    onSave(changes)
    onCancelEdit()
  }

  const surfaceGrid =
    variant === 'list'
      ? 'grid-cols-[minmax(0,1.2fr)_minmax(96px,0.7fr)_92px_64px_96px_34px]'
      : 'grid-cols-[minmax(0,1fr)_92px_64px_96px_34px]'

  return (
    <div
      ref={rowRef}
      className={cn(
        'group relative border-b border-[--module-divider-color] last:border-b-0',
        isEditing && 'bg-(--bg-primary)'
      )}
    >
      <div
        className={cn(
          'grid cursor-pointer items-center gap-3 px-4 py-2 transition duration-200 ease-out hover:bg-(--bg-secondary)',
          surfaceGrid,
          isEditing && 'border-l-4 border-l-(--green) pl-3'
        )}
        onClick={onEditStart}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <IncomeGroupIcon group={groupLabel} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-(--text-primary)">{income.name}</div>
          </div>
        </div>
        {variant === 'list' && (
          <div className="truncate text-[12px] text-(--text-tertiary)">{groupLabel}</div>
        )}
        <div className="text-left text-[13px] font-normal text-(--text-secondary)">
          {frequencyLabel(income.frequency)}
        </div>
        <div className="text-right text-[12px] text-(--text-tertiary)">{ownerLabel(income.owner)}</div>
        <div className="text-right text-[13px] font-normal tabular-nums text-(--green)">
          +{formatCurrency(income.amount)}
        </div>
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onEditStart()
            }}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--text-primary) group-hover:opacity-100"
            aria-label={`Edit ${income.name}`}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
          isEditing ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {isEditing && (
          <IncomeEditForm
            income={income}
            onSave={saveAndClose}
            onCancel={onCancelEdit}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}
