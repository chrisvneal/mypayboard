'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Eye, EyeOff, Globe, Pencil } from 'lucide-react'
import { GOLD_EDIT_ACCENT } from '@/components/modules/header-colors'
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { resolveIcon, type IconKey } from '@/lib/icons'
import { IconPicker } from './IconPicker'
import { formatRecurringDueDateDisplay } from '@/lib/due-date'
import { plannedMonthlyPayment } from '@/lib/creditors'
import { formatCurrency } from '@/lib/format'
import { cn, isPortaledEditOverlayTarget, suppressNextClick } from '@/lib/utils'
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
  const digits = creditor.accountLastFour?.replace(/\D/g, '').slice(-4)
  return digits ? [digits] : []
}

/**
 * Column template for the expense list view. Shared between the table header
 * (`ExpenseListView`) and each `ExpenseRow` so they stay aligned. When the
 * account-number display pref is on, a dedicated narrow Account column is
 * inserted between Bill Name and Category.
 */
export function expenseListGridCols(showAccount: boolean): string {
  return showAccount
    ? 'grid-cols-[1fr_96px] md:grid-cols-[minmax(140px,1.4fr)_88px_minmax(112px,0.7fr)_96px_76px_76px_56px]'
    : 'grid-cols-[1fr_96px] md:grid-cols-[minmax(140px,1.4fr)_minmax(112px,0.7fr)_96px_76px_76px_56px]'
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
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const muted = Boolean(creditor.muted)
  const due = dueDisplay(creditor)
  const accountDigits = accountLastFourValues(creditor)
  const [justSaved, setJustSaved] = useState(false)

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

  // Brief post-save row highlight, auto-clears (no layout shift).
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 700)
    return () => clearTimeout(timer)
  }, [justSaved])

  const saveAndClose = (changes: Partial<Creditor>) => {
    onSave(changes)
    onCancelEdit()
    setJustSaved(true)
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

  const href = externalHref(creditor.url ?? creditor.website)

  const { Icon: ExpenseIcon, key: resolvedIconKey } = resolveIcon(creditor.icon, categoryLabel)

  const surfaceGrid =
    variant === 'list'
      ? expenseListGridCols(displayPrefs.accountNumber)
      : displayPrefs.accountNumber
        ? 'grid-cols-[minmax(0,1fr)_52px_84px] md:grid-cols-[minmax(140px,1fr)_88px_62px_92px_60px]'
        : 'grid-cols-[minmax(0,1fr)_52px_84px] md:grid-cols-[minmax(140px,1fr)_62px_92px_60px]'

  const surfaceMinW = variant === 'list' ? 'min-w-0 md:min-w-[560px]' : 'min-w-0 md:min-w-[360px]'

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
        data-bills-income-row-surface
        role="button"
        tabIndex={0}
        aria-label={isEditing ? `Close edit for ${creditor.name}` : `Edit ${creditor.name}`}
        aria-expanded={isEditing}
        className={cn(
          'grid cursor-pointer items-center gap-3 px-4 py-2 transition-[background-color] duration-200 ease-out hover:bg-(--bg-secondary)',
          surfaceMinW,
          surfaceGrid,
          muted && 'bg-(--bg-secondary) text-(--text-tertiary) italic',
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
              <ExpenseIcon className="size-4" />
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
            <div
              className={cn(
                'flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-(--text-primary)',
                muted && 'text-(--text-tertiary)'
              )}
            >
              <span className={cn('min-w-0 truncate', muted && 'pr-[0.2em]')}>
                {creditor.name}
              </span>
            </div>
          </div>
        </div>

        {displayPrefs.accountNumber ? (
          <div className="hidden md:block min-w-0">
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
          <div className="hidden md:block truncate text-[12px] text-(--text-tertiary)">
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
          <div className="hidden md:block text-right text-[12px] text-(--text-tertiary)">{displayPrefs.dueDate ? due : ''}</div>
        ) : null}

        {variant === 'list' ? (
          <div className="hidden md:flex justify-center">
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

        <div className="hidden md:flex items-center justify-end gap-1.5">
          {displayPrefs.linkIcon && (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex size-7 items-center justify-center rounded-input text-(--text-secondary) transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--navy)"
                aria-label={`Open ${creditor.name} website`}
              >
                <Globe className="size-3.5" />
              </a>
            ) : (
              <span aria-hidden className="inline-flex size-7 shrink-0" />
            )
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleMute() }}
            className={cn(
              'inline-flex size-7 cursor-pointer items-center justify-center rounded-input text-(--text-tertiary) opacity-0 transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--text-primary) group-hover:opacity-100',
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
              if (isEditing) onCancelEdit()
              else onEditStart()
            }}
            onPointerDown={e => e.stopPropagation()}
            className={cn(
              'inline-flex size-7 cursor-pointer items-center justify-center rounded-input text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-tertiary) hover:text-(--text-primary)',
              isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            style={isEditing ? { color: GOLD_EDIT_ACCENT } : undefined}
            aria-label={isEditing ? `Close edit for ${creditor.name}` : `Edit ${creditor.name}`}
            aria-expanded={isEditing}
          >
            <Pencil className="size-3.5" />
          </button>
        </div>

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
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Edit expense"
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
