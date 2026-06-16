'use client'

import { useEffect, useRef } from 'react'
import { BriefcaseBusiness, PlusCircle, Shield } from 'lucide-react'
import type { CategoryDefinition, Income } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { monthlyIncomeAmount } from '@/lib/incomes'
import { cn } from '@/lib/utils'
import { CollapsibleEditPanel } from './CollapsibleEditPanel'
import { IncomeEditForm } from './IncomeEditForm'

type IncomeRowProps = {
  income: Income
  groupLabel: string
  groupOptions: CategoryDefinition[]
  onGroupCreate: (group: string) => void
  isEditing: boolean
  onEditStart: () => void
  onCancelEdit: () => void
  onSave: (changes: Partial<Income>) => void
  onArchive: () => void
  onToggleMute?: () => void
  variant?: 'grouped' | 'list'
  isLast?: boolean
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

export function IncomeRow({
  income,
  groupLabel,
  groupOptions,
  onGroupCreate,
  isEditing,
  onEditStart,
  onCancelEdit,
  onSave,
  onArchive,
  onToggleMute,
  variant = 'grouped',
  isLast = false,
}: IncomeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEditing) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node
      if (rowRef.current?.contains(target)) return
      if ((target as Element).closest?.('a[href]')) return
      onCancelEdit()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isEditing, onCancelEdit])

  const saveAndClose = (changes: Partial<Income>) => {
    onSave(changes)
    onCancelEdit()
  }

  const toggleEdit = () => {
    if (isEditing) onCancelEdit()
    else onEditStart()
  }

  const surfaceGrid =
    variant === 'list'
      ? 'grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.6fr)_90px_70px_90px]'
      : 'grid-cols-[minmax(140px,1fr)_92px_64px_96px]'

  const surfaceMinW = variant === 'list' ? 'min-w-[540px]' : 'min-w-[340px]'

  return (
    <div
      ref={rowRef}
      className={cn(
        'group relative border-b border-[--module-divider-color]',
        surfaceMinW,
        isLast && 'border-b-0',
        isEditing && 'bg-(--bg-primary)'
      )}
    >
      <div
        className={cn(
          'relative',
          'before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-1 before:transition-colors before:duration-200',
          isEditing ? 'md:before:bg-[#F5AF02]' : 'before:bg-transparent hover:before:bg-(--navy-dark)',
        )}
      >
      <div
        className={cn(
          'grid cursor-pointer items-center gap-3 px-4 py-2 transition-[background-color] duration-200 ease-out hover:bg-(--bg-secondary)',
          surfaceMinW,
          surfaceGrid
        )}
        onClick={toggleEdit}
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
          +{formatCurrency(monthlyIncomeAmount(income))}
        </div>
      </div>
      </div>{/* end accent-bar wrapper */}

      {/* Desktop: inline expand (md+) */}
      <CollapsibleEditPanel open={isEditing} className="hidden md:grid">
        {/* Keyed by edit state so the form remounts each time it opens. */}
        <IncomeEditForm
          key={`${income.id}:${isEditing ? 'editing' : 'idle'}`}
          income={income}
          groupOptions={groupOptions}
          onGroupCreate={onGroupCreate}
          onSave={saveAndClose}
          onCancel={onCancelEdit}
          onArchive={onArchive}
          onToggleMute={onToggleMute}
          muted={Boolean(income.muted)}
        />
      </CollapsibleEditPanel>

      {/* Mobile: fixed bottom sheet (below md) — renders outside the scroll context */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelEdit} />
          <div className="relative max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-(--bg-primary) shadow-xl">
            <IncomeEditForm
              key={`${income.id}:mobile:editing`}
              income={income}
              groupOptions={groupOptions}
              onGroupCreate={onGroupCreate}
              onSave={saveAndClose}
              onCancel={onCancelEdit}
              onArchive={onArchive}
              onToggleMute={onToggleMute}
              muted={Boolean(income.muted)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
