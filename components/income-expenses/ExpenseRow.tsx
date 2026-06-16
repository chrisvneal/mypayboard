'use client'

import { useEffect, useRef, useState } from 'react'
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
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { formatRecurringDueDateDisplay } from '@/lib/due-date'
import { plannedMonthlyPayment } from '@/lib/creditors'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ExpenseDisplayPrefs } from './DisplayToggle'
import { CollapsibleEditPanel } from './CollapsibleEditPanel'
import { ExpenseEditForm } from './ExpenseEditForm'

type ExpenseRowProps = {
  creditor: Creditor
  categoryLabel: string
  categories: CategoryDefinition[]
  onCategoryCreate: (category: string) => void
  displayPrefs: ExpenseDisplayPrefs
  isEditing: boolean
  onEditStart: () => void
  onCancelEdit: () => void
  onSave: (changes: Partial<Creditor>) => void
  onToggleMute: () => void
  onArchive: () => void
  variant?: 'grouped' | 'list'
  isLast?: boolean
  /** Row sits directly under another row's expanded edit form — no top divider. */
  followsExpandedEdit?: boolean
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

function dueDisplay(creditor: Creditor): string {
  if (typeof creditor.dueDay === 'number') return `*/${creditor.dueDay}`
  if (creditor.dueDay === 'asap') return 'ASAP'
  if (creditor.dueDay === 'varies') return 'Varies'
  return formatRecurringDueDateDisplay(creditor.dueDatePattern)
}

function externalHref(raw?: string): string | undefined {
  if (!raw) return undefined
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

function accountLastFourValues(creditor: Creditor): string[] {
  return Array.from(
    new Set([...(creditor.accountLastFours ?? []), creditor.accountLastFour]
      .map(value => value?.replace(/\D/g, '').slice(-4))
      .filter((value): value is string => Boolean(value)))
  )
}

/**
 * Column template for the expense list view. Shared between the table header
 * (`ExpenseListView`) and each `ExpenseRow` so they stay aligned. When the
 * account-number display pref is on, a dedicated narrow Account column is
 * inserted between Bill Name and Category.
 */
export function expenseListGridCols(showAccount: boolean): string {
  return showAccount
    ? 'grid-cols-[minmax(140px,1.4fr)_88px_minmax(112px,0.7fr)_96px_76px_76px]'
    : 'grid-cols-[minmax(140px,1.4fr)_minmax(112px,0.7fr)_96px_76px_76px]'
}

export function ExpenseRow({
  creditor,
  categoryLabel,
  categories,
  onCategoryCreate,
  displayPrefs,
  isEditing,
  onEditStart,
  onCancelEdit,
  onSave,
  onToggleMute,
  onArchive,
  variant = 'grouped',
  isLast = false,
  followsExpandedEdit = false,
}: ExpenseRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const muted = Boolean(creditor.muted)
  const due = dueDisplay(creditor)
  const accountDigits = accountLastFourValues(creditor)
  const [justSaved, setJustSaved] = useState(false)

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

  // Brief post-save row highlight, auto-clears (no layout shift).
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 1200)
    return () => clearTimeout(timer)
  }, [justSaved])

  const saveAndClose = (changes: Partial<Creditor>) => {
    onSave(changes)
    onCancelEdit()
    setJustSaved(true)
  }

  const toggleEdit = () => {
    if (isEditing) onCancelEdit()
    else onEditStart()
  }

  const surfaceGrid =
    variant === 'list'
      ? expenseListGridCols(displayPrefs.accountNumber)
      : displayPrefs.accountNumber
        ? 'grid-cols-[minmax(140px,1fr)_88px_62px_92px]'
        : 'grid-cols-[minmax(140px,1fr)_62px_92px]'

  const surfaceMinW = variant === 'list' ? 'min-w-[600px]' : 'min-w-[360px]'

  return (
    <div
      ref={rowRef}
      className={cn(
        'group relative border-b border-[--module-divider-color]',
        surfaceMinW,
        (isLast || isEditing) && 'border-b-0',
        followsExpandedEdit && 'border-t-0',
        isEditing && 'bg-(--bg-primary)'
      )}
    >
      {/* Accent-bar wrapper */}
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
          surfaceGrid,
          muted && 'bg-(--bg-secondary) text-(--text-tertiary)',
          justSaved && 'bg-[color-mix(in_srgb,var(--green)_14%,transparent)]'
        )}
        onClick={toggleEdit}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <ExpenseItemIcon creditor={creditor} category={categoryLabel} />
          </span>
          <div className="min-w-0">
            <div
              className={cn(
                'flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-(--text-primary)',
                muted && 'text-(--text-tertiary)'
              )}
            >
              <span className={cn('min-w-0 truncate', muted && 'italic pr-[0.2em]')}>
                {creditor.name}
              </span>
            </div>
          </div>
        </div>

        {displayPrefs.accountNumber ? (
          <div className="min-w-0">
            {accountDigits.length > 0 &&
              (variant === 'list' ? (
                <div className="flex flex-col gap-0.5 text-[12px] tabular-nums text-(--text-tertiary)">
                  {accountDigits.map(digits => (
                    <span key={digits} className="truncate">
                      •••• {digits}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  {accountDigits.map(digits => (
                    <span
                      key={digits}
                      className="shrink-0 rounded-md bg-(--bg-secondary) px-2 py-0.5 text-xs font-normal tracking-wide text-(--text-tertiary)"
                    >
                      •••• {digits}
                    </span>
                  ))}
                </div>
              ))}
          </div>
        ) : null}

        {variant === 'list' ? (
          <div className={cn('truncate text-[12px] text-(--text-tertiary)', muted && 'italic pr-[0.2em]')}>
            {categoryLabel}
          </div>
        ) : (
          <div className="text-right text-[12px] text-(--text-tertiary)">
            {displayPrefs.dueDate ? due : ''}
          </div>
        )}

        {variant === 'list' ? (
          <div className={cn('text-right text-[13px] font-normal tabular-nums text-(--text-secondary)', muted && 'text-(--text-tertiary)')}>
            {formatCurrency(plannedMonthlyPayment(creditor))}
          </div>
        ) : (
          <div
            className={cn(
              'text-right text-[13px] font-normal tabular-nums text-(--text-secondary)',
              muted && 'text-(--text-tertiary)'
            )}
          >
            {formatCurrency(plannedMonthlyPayment(creditor))}
          </div>
        )}

        {variant === 'list' ? (
          <div className="text-right text-[12px] text-(--text-tertiary)">{displayPrefs.dueDate ? due : ''}</div>
        ) : null}

        {variant === 'list' ? (
          <div className="flex justify-center">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                muted ? 'bg-(--bg-tertiary) text-(--text-tertiary)' : 'bg-(--navy-light) text-(--navy)'
              )}
            >
              {muted ? 'Muted' : 'Active'}
            </span>
          </div>
        ) : null}

      </div>
      </div>{/* end accent-bar wrapper */}

      {/* Desktop: inline expand (md+) */}
      <CollapsibleEditPanel
        open={isEditing}
        className={cn(
          'hidden md:grid',
          isEditing && !isLast && 'border-b-2 border-b-[--expense-edit-separator]'
        )}
      >
        {/* Keyed by edit state so the form remounts each time it opens. */}
        <ExpenseEditForm
          key={`${creditor.id}:${isEditing ? 'editing' : 'idle'}`}
          creditor={creditor}
          categories={categories}
          onCategoryCreate={onCategoryCreate}
          onSave={saveAndClose}
          onCancel={onCancelEdit}
          onArchive={onArchive}
          onToggleMute={onToggleMute}
          muted={muted}
        />
      </CollapsibleEditPanel>

      {/* Mobile: fixed bottom sheet (below md) — renders outside the scroll context */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onCancelEdit} />
          <div className="relative max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-(--bg-primary) shadow-xl">
            <ExpenseEditForm
              key={`${creditor.id}:mobile:editing`}
              creditor={creditor}
              categories={categories}
              onCategoryCreate={onCategoryCreate}
              onSave={saveAndClose}
              onCancel={onCancelEdit}
              onArchive={onArchive}
              onToggleMute={onToggleMute}
              muted={muted}
            />
          </div>
        </div>
      )}
    </div>
  )
}
