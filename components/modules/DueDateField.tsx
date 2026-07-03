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
}: DueDateFieldProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const display = dayOnly
    ? formatTemplateDueDayDisplay(value)
    : formatDueDateDisplay(value, boardMonth)
  const hasValue = Boolean(display) || isAsapDueDate(value)

  return (
    <div
      className={cn(
        variant === 'row' ? 'min-w-0 w-full' : 'relative shrink-0',
        className
      )}
    >
      <button
        ref={anchorRef}
        type="button"
        className={cn(
          variant === 'form' &&
            formLayout === 'inline' &&
            'add-bill-form__input flex h-8 w-[132px] shrink-0 items-center justify-center text-left transition-colors duration-150 hover:bg-(--bg-secondary)',
          variant === 'form' &&
            formLayout === 'stacked' &&
            'field-control flex w-full items-center justify-center border border-border bg-(--bg-secondary) px-3 py-2.5 text-[14px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)',
          variant === 'row' && 'flex cursor-pointer items-center justify-center',
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
          !hasValue && variant === 'row' && 'h-6 w-11 shrink-0 rounded-md bg-(--bg-tertiary)',
        )}
        aria-label={variant === 'row' && !hasValue ? 'Set due date' : undefined}
        onClick={() => setOpen(true)}
      >
        {hasValue || variant === 'form' ? (
          <span
            className={cn(
              'truncate',
              variant === 'form' && !hasValue && 'text-(--text-tertiary)'
            )}
          >
            {hasValue ? display : placeholder}
          </span>
        ) : null}
      </button>
      <DueDateEditor
        open={open}
        anchorRef={anchorRef}
        value={value}
        boardMonth={boardMonth}
        boardYear={boardYear}
        onClose={() => setOpen(false)}
        onCommit={onChange}
      />
    </div>
  )
}
