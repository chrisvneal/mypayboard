'use client'

import { useEffect, useRef } from 'react'
import {
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  PiggyBank,
  ReceiptText,
  Wifi,
} from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { formatRecurringDueDateDisplay } from '@/lib/due-date'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import type { ExpenseDisplayPrefs } from './DisplayToggle'
import { ExpenseEditForm } from './ExpenseEditForm'

type ExpenseRowProps = {
  creditor: Creditor
  categoryLabel: string
  categories: string[]
  onCategoryCreate: (category: string) => void
  displayPrefs: ExpenseDisplayPrefs
  isEditing: boolean
  onEditStart: () => void
  onCancelEdit: () => void
  onSave: (changes: Partial<Creditor>) => void
  onToggleMute: () => void
  onArchive: () => void
  onDelete: () => void
  variant?: 'grouped' | 'list'
}

function ExpenseCategoryIcon({ category }: { category: string }) {
  const normalized = category.toLowerCase()
  if (normalized.includes('subscription')) return <Wifi className="size-4" />
  if (normalized.includes('saving')) return <PiggyBank className="size-4" />
  if (normalized.includes('credit')) return <CreditCard className="size-4" />
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
  onDelete,
  variant = 'grouped',
}: ExpenseRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const muted = Boolean(creditor.muted)
  const href = externalHref(creditor.url ?? creditor.website)
  const due = dueDisplay(creditor)
  const accountDigits = creditor.accountLastFour ? `•••• ${creditor.accountLastFour}` : ''

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

  const saveAndClose = (changes: Partial<Creditor>) => {
    onSave(changes)
    onCancelEdit()
  }

  const surfaceGrid =
    variant === 'list'
      ? 'grid-cols-[minmax(0,1.4fr)_minmax(112px,0.7fr)_96px_76px_76px_56px]'
      : 'grid-cols-[minmax(0,1fr)_62px_92px_60px]'

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
          'grid cursor-pointer items-center gap-3 px-4 py-4 transition duration-200 ease-out hover:bg-(--bg-secondary)',
          surfaceGrid,
          isEditing && 'border-l-4 border-l-(--navy) pl-3',
          muted && 'bg-(--bg-secondary) text-(--text-tertiary)'
        )}
        onClick={onEditStart}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--text-secondary)">
            <ExpenseCategoryIcon category={categoryLabel} />
          </span>
          <div className="min-w-0">
            <div
              className={cn(
                'truncate text-[13px] font-medium text-(--text-primary)',
                muted && 'italic text-(--text-tertiary)'
              )}
            >
              {creditor.name}
            </div>
            {variant === 'grouped' && displayPrefs.accountNumber && accountDigits && (
              <div className="mt-0.5 truncate text-[11px] tracking-[0.15em] text-(--text-tertiary)">
                {accountDigits}
              </div>
            )}
            {variant === 'list' && (
              displayPrefs.accountNumber &&
              accountDigits && (
                <div className={cn('mt-0.5 truncate text-[11px] tracking-[0.15em] text-(--text-tertiary)', muted && 'italic')}>
                  {accountDigits}
                </div>
              )
            )}
          </div>
        </div>

        {variant === 'list' ? (
          <div className={cn('truncate text-[12px] text-(--text-tertiary)', muted && 'italic')}>
            {categoryLabel}
          </div>
        ) : (
          <div className="text-right text-[12px] text-(--text-tertiary)">
            {displayPrefs.dueDate ? due : ''}
          </div>
        )}

        {variant === 'list' ? (
          <div className={cn('text-right text-[13px] font-normal tabular-nums text-(--text-secondary)', muted && 'text-(--text-tertiary)')}>
            {formatCurrency(creditor.defaultAmount)}
          </div>
        ) : (
          <div
            className={cn(
              'text-right text-[13px] font-normal tabular-nums text-(--text-secondary)',
              muted && 'text-(--text-tertiary)'
            )}
          >
            {formatCurrency(creditor.defaultAmount)}
          </div>
        )}

        {variant === 'list' ? (
          <div className="text-right text-[12px] text-(--text-tertiary)">{displayPrefs.dueDate ? due : ''}</div>
        ) : null}

        {variant === 'list' ? (
          <div className="flex justify-end">
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

        <div className="flex items-center justify-end gap-1">
          {displayPrefs.linkIcon && href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex size-7 items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--navy) group-hover:opacity-100"
              aria-label={`Open ${creditor.name} website`}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onToggleMute()
            }}
            className={cn(
              'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--text-primary) group-hover:opacity-100',
              muted && 'text-(--text-secondary) opacity-100'
            )}
            aria-label={muted ? `Unmute ${creditor.name}` : `Mute ${creditor.name}`}
          >
            {muted ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onEditStart()
            }}
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--text-primary) group-hover:opacity-100"
            aria-label={`Edit ${creditor.name}`}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
          isEditing ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {isEditing && (
          <ExpenseEditForm
            creditor={creditor}
            categories={categories}
            onCategoryCreate={onCategoryCreate}
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
