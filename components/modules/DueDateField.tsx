'use client'

import { useRef, useState } from 'react'
import { formatDueDateDisplay, formatTemplateDueDayDisplay, isAsapDueDate } from '@/lib/due-date'
import { cn } from '@/lib/utils'
import { DueDateEditor } from './DueDateEditor'

export type DueDateFieldVariant = 'form' | 'row'
export type DueDateFieldRowTone = 'default' | 'paid' | 'pendingPaid'
export type DueDateFieldFormLayout = 'inline' | 'stacked'

export type DueDateFieldProps = {
  value: string
  boardMonth?: number
  boardYear: number
  onChange: (dueDate: string) => void
  placeholder?: string
  variant?: DueDateFieldVariant
  /** Form variant only — inline matches add-bill row inputs; stacked matches mobile sheet fields. */
  formLayout?: DueDateFieldFormLayout
  /** Template editor: show day-of-month only (e.g. "16"), not M/D. */
  dayOnly?: boolean
  /** Row variant only — matches bill paid / pending-paid visual state. */
  rowTone?: DueDateFieldRowTone
  /** Row variant only — overrides color when rowTone === 'default' (e.g. past due). */
  overrideTone?: 'pastDue'
  className?: string
  /** Notifies parent when the due-date popover opens or closes (row variant). */
  onOpenChange?: (open: boolean) => void
  /** Recurring "*\/N" day pattern only — whether it resolves to next month. */
  dueNextMonth?: boolean
  /** Omit to hide the "Due next month" toggle (e.g. master-list forms). */
  onNextMonthChange?: (value: boolean) => void
  /** Row variant only — bill has a highlight color set. Suppresses the empty-state
   *  gray placeholder block, which reads as a stray UI affordance against a
   *  colored row rather than the neutral "no date set yet" cue it's meant to be. */
  highlighted?: boolean
}

export function DueDateField({
  value,
  boardMonth,
  boardYear,
  onChange,
  placeholder = 'Due date',
  variant = 'form',
  formLayout = 'inline',
  dayOnly = false,
  rowTone = 'default',
  overrideTone,
  className,
  onOpenChange,
  dueNextMonth = false,
  onNextMonthChange,
  highlighted = false,
}: DueDateFieldProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLElement | null>(null)
  const setAnchorRef = (node: HTMLElement | null) => {
    anchorRef.current = node
  }

  const setPickerOpen = (next: boolean) => {
    setOpen(next)
    if (!next) anchorRef.current?.blur()
    onOpenChange?.(next)
  }
  const display = dayOnly
    ? formatTemplateDueDayDisplay(value)
    : formatDueDateDisplay(value, boardMonth, dueNextMonth, boardYear)
  const hasValue = Boolean(display) || isAsapDueDate(value)
  // Day-only display never shows a month, so "next month" needs its own marker;
  // the M/D display already bakes the shifted month into the text itself.
  const showNextMonthMarker = dayOnly && dueNextMonth && hasValue

  return (
    <div
      className={cn(
        variant === 'row' ? 'min-w-0 w-full' : 'relative shrink-0',
        className
      )}
    >
      <button
        ref={variant === 'row' && !hasValue ? setAnchorRef : undefined}
        type="button"
        className={cn(
          variant === 'form' &&
            formLayout === 'inline' &&
            'add-bill-form__input flex h-8 w-[132px] shrink-0 items-center justify-center text-left transition-colors duration-150 hover:bg-(--bg-secondary)',
          variant === 'form' &&
            formLayout === 'stacked' &&
            'field-control flex w-full items-center justify-center border border-border bg-(--bg-secondary) px-3 py-2.5 text-[14px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)',
          variant === 'row' && 'flex cursor-pointer items-center justify-center outline-none focus:outline-none focus-visible:outline-none',
          variant === 'row' &&
            hasValue &&
            'w-full truncate rounded-md px-0.5 py-0.5 text-center text-[12px] font-medium',
          variant === 'row' &&
            hasValue &&
            rowTone === 'default' &&
            !overrideTone &&
            'text-(--text-secondary) transition-colors duration-150 hover:bg-(--bg-tertiary)',
          variant === 'row' &&
            hasValue &&
            rowTone === 'default' &&
            overrideTone === 'pastDue' &&
            'text-(--danger) transition-colors duration-150 hover:bg-(--bg-tertiary)',
          variant === 'row' && hasValue && rowTone === 'paid' && 'text-(--text-tertiary) italic',
          variant === 'row' && hasValue && rowTone === 'pendingPaid' && 'text-(--text-secondary)',
          // Empty row cell: light gray block — no text, no hover until a date is set.
          // Suppressed on a highlighted row (see `highlighted` prop doc). Faded
          // toward transparent (not swapped to a different token) so it lightens
          // consistently in both themes rather than reversing in dark mode.
          !hasValue &&
            variant === 'row' &&
            !highlighted &&
            'h-6 w-11 shrink-0 rounded-md bg-[color-mix(in_srgb,var(--bg-tertiary)_55%,transparent)]',
        )}
        aria-label={
          variant === 'row' && !hasValue
            ? 'Set due date'
            : showNextMonthMarker
              ? `${display}, due next month`
              : undefined
        }
        title={showNextMonthMarker ? 'Due next month' : undefined}
        onClick={() => setPickerOpen(true)}
      >
        {hasValue || variant === 'form' ? (
          <span
            ref={setAnchorRef}
            className={cn(
              'truncate',
              variant === 'form' && !hasValue && 'text-(--text-tertiary)'
            )}
          >
            {hasValue ? display : placeholder}
            {showNextMonthMarker && (
              <span className="ml-0.5 inline-block size-1 shrink-0 rounded-full bg-(--navy)" aria-hidden />
            )}
          </span>
        ) : null}
      </button>
      <DueDateEditor
        open={open}
        anchorRef={anchorRef}
        value={value}
        boardMonth={boardMonth}
        boardYear={boardYear}
        dueNextMonth={dueNextMonth}
        onNextMonthChange={onNextMonthChange}
        onClose={() => setPickerOpen(false)}
        onCommit={onChange}
      />
    </div>
  )
}
