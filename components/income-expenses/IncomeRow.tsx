'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { CategoryDefinition, Income } from '@/lib/types'
import { resolveIcon, type IconKey } from '@/lib/icons'
import { IconPicker } from './IconPicker'
import { formatCurrency } from '@/lib/format'
import { useMyPayBoard } from '@/lib/MyPayBoardProvider'
import { resolveOwnerDisplayLabel } from '@/lib/user-display-name'
import { cn, isPortaledEditOverlayTarget, suppressNextClick } from '@/lib/utils'
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
  const { data } = useMyPayBoard()
  const rowRef = useRef<HTMLDivElement>(null)
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 700)
    return () => clearTimeout(timer)
  }, [justSaved])

  useEffect(() => {
    if (!isEditing) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node
      if (rowRef.current?.contains(target)) return
      if ((target as Element).closest?.('[data-bills-income-row-surface]')) return
      if ((target as Element).closest?.('[data-bills-income-edit-panel], .inline-create-form-host')) return
      if ((target as Element).closest?.('a[href]')) return
      if (isPortaledEditOverlayTarget(e.target)) return
      onCancelEdit()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isEditing, onCancelEdit])

  const saveAndClose = (changes: Partial<Income>) => {
    onSave(changes)
    onCancelEdit()
  }

  // Open-on-tap must not fire on pointerdown alone — on touch devices the
  // gesture that starts a scroll also starts on the row surface, so opening
  // immediately (before the browser knows it's a scroll, not a tap) opened
  // rows every time a user tried to scroll past them. Record where the
  // pointer went down and only treat it as a tap if pointerup lands within a
  // small movement threshold of that point.
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const TAP_MOVE_THRESHOLD_PX = 10

  const handleSurfacePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element
    if (
      target.closest(
        'button, a[href], input, textarea, select, [data-slot="select-trigger"], [data-bills-income-edit-panel]'
      )
    ) {
      return
    }
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleSurfacePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = pointerDownPosRef.current
    pointerDownPosRef.current = null
    if (!start || isEditing) return
    const target = e.target as Element
    if (
      target.closest(
        'button, a[href], input, textarea, select, [data-slot="select-trigger"], [data-bills-income-edit-panel]'
      )
    ) {
      return
    }
    const movedPx = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    if (movedPx > TAP_MOVE_THRESHOLD_PX) return
    e.preventDefault()
    e.stopPropagation()
    // The browser's trailing click for this press still fires after
    // onEditStart() below swaps this row for the mobile sheet — see
    // suppressNextClick() for why that lands on whatever sheet field is at
    // the same screen coordinates and opens/focuses it.
    suppressNextClick()
    onEditStart()
  }

  const { Icon: IncomeIcon, key: resolvedIconKey } = resolveIcon(income.icon, groupLabel)

  const surfaceGrid =
    variant === 'list'
      ? 'grid-cols-[1fr_90px] md:grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.6fr)_90px_70px_90px]'
      : 'grid-cols-[minmax(140px,1fr)_92px_64px_96px]'

  const surfaceMinW = variant === 'list' ? 'min-w-0 md:min-w-[540px]' : 'min-w-[340px]'

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
        data-bills-income-row-surface
        role="button"
        tabIndex={0}
        aria-label={isEditing ? `Close edit for ${income.name}` : `Edit ${income.name}`}
        aria-expanded={isEditing}
        className={cn(
          'grid cursor-pointer items-center gap-3 px-4 py-2 transition-[background-color] duration-200 ease-out hover:bg-(--bg-secondary)',
          surfaceMinW,
          surfaceGrid,
          justSaved && 'bg-[color-mix(in_srgb,var(--green)_14%,transparent)]'
        )}
        onPointerDown={handleSurfacePointerDown}
        onPointerUp={handleSurfacePointerUp}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (isEditing) onCancelEdit()
            else onEditStart()
          }
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <button
              ref={iconButtonRef}
              type="button"
              aria-label="Change icon"
              onClick={e => { e.stopPropagation(); setIconPickerOpen(o => !o) }}
              onPointerDown={e => e.stopPropagation()}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-(--bg-tertiary) text-(--text-secondary) transition-colors hover:brightness-95"
            >
              <IncomeIcon className="size-4" />
            </button>
            {iconPickerOpen && (
              <IconPicker
                selected={resolvedIconKey}
                onSelect={(key: IconKey) => { onSave({ icon: key }); setJustSaved(true) }}
                onClose={() => setIconPickerOpen(false)}
                anchorRef={iconButtonRef}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-(--text-primary)">{income.name}</div>
          </div>
        </div>
        {variant === 'list' && (
          <div className="hidden md:block truncate text-[12px] text-(--text-tertiary)">{groupLabel}</div>
        )}
        <div className={cn('text-left text-[13px] font-normal text-(--text-secondary)', variant === 'list' && 'hidden md:block')}>
          {frequencyLabel(income.frequency)}
        </div>
        <div className={cn('text-right text-[12px] text-(--text-tertiary)', variant === 'list' && 'hidden md:block')}>
          {resolveOwnerDisplayLabel(income.owner, data.users)}
        </div>
        <div className="text-right text-[13px] font-normal tabular-nums text-(--green)">
          +{formatCurrency(income.amount)}
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
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Edit income source"
        >
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden
            onPointerDown={e => {
              if (isPortaledEditOverlayTarget(e.target)) return
              onCancelEdit()
            }}
          />
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
