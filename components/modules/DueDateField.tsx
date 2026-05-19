'use client'

import { useRef, useState } from 'react'
import { formatDueDateDisplay, isAsapDueDate } from '@/lib/due-date'
import { cn } from '@/lib/utils'
import { DueDateEditor } from './DueDateEditor'

export type DueDateFieldVariant = 'form' | 'row'

export type DueDateFieldProps = {
  value: string
  boardMonth?: number
  boardYear: number
  onChange: (dueDate: string) => void
  placeholder?: string
  variant?: DueDateFieldVariant
  className?: string
}

export function DueDateField({
  value,
  boardMonth,
  boardYear,
  onChange,
  placeholder = 'Due date',
  variant = 'form',
  className,
}: DueDateFieldProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const display = formatDueDateDisplay(value, boardMonth)
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
          variant === 'form'
            ? 'flex h-8 w-[132px] items-center justify-center rounded-lg border border-border bg-transparent px-2 text-[13px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)'
            : 'w-full truncate rounded px-0.5 py-0.5 text-center text-[12px] font-medium text-(--text-secondary)',
          !hasValue && variant === 'row' && 'text-transparent'
        )}
        onClick={() => setOpen(true)}
      >
        <span
          className={cn(
            'truncate',
            variant === 'form' && !hasValue && 'text-(--text-tertiary)'
          )}
        >
          {hasValue ? display : variant === 'form' ? placeholder : '\u00a0'}
        </span>
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
