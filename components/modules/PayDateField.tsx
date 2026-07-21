'use client'

import { useRef, useState } from 'react'
import { formatDate } from '@/lib/format'
import { payDateToIso } from '@/lib/pay-date'
import { cn } from '@/lib/utils'
import { PayDateEditor } from './PayDateEditor'

export type PayDateFieldVariant = 'full' | 'compact'

export type PayDateFieldProps = {
  value: string
  onChange: (payDateIso: string) => void
  placeholder?: string
  variant?: PayDateFieldVariant
  className?: string
  templatePreviewMonth?: number
  templatePreviewYear?: number
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function PayDateField({
  value,
  onChange,
  placeholder = 'Pay date',
  variant = 'full',
  className,
  templatePreviewMonth,
  templatePreviewYear,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: PayDateFieldProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const iso = payDateToIso(value)
  const display = formatDate(iso || value)
  const hasValue = Boolean(iso)

  return (
    <div
      className={cn(
        variant === 'full' ? 'relative w-full' : 'relative shrink-0',
        className
      )}
    >
      <button
        ref={anchorRef}
        type="button"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          variant === 'full'
            ? 'field-control flex h-9 w-full items-center border border-border px-3 text-left text-[13px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)'
            : 'flex h-8 w-[132px] items-center justify-center rounded-[var(--radius-input)] border border-border bg-transparent px-2 text-[13px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)',
          !hasValue && 'text-(--text-tertiary)'
        )}
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate">{hasValue ? display : placeholder}</span>
      </button>
      <PayDateEditor
        open={open}
        anchorRef={anchorRef}
        value={iso || value}
        onClose={() => setOpen(false)}
        onCommit={onChange}
        templatePreviewMonth={templatePreviewMonth}
        templatePreviewYear={templatePreviewYear}
      />
    </div>
  )
}
