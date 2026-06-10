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
}

export function PayDateField({
  value,
  onChange,
  placeholder = 'Pay date',
  variant = 'full',
  className,
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
        className={cn(
          variant === 'full'
            ? 'flex h-9 w-full items-center rounded-lg border border-border bg-(--bg-primary) px-3 text-left text-[13px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)'
            : 'flex h-8 w-[132px] items-center justify-center rounded-lg border border-border bg-transparent px-2 text-[13px] transition-colors duration-150 hover:bg-(--bg-secondary) focus:border-(--navy)',
          !hasValue && 'text-(--text-tertiary)'
        )}
        onClick={() => setOpen(true)}
      >
        <span className="truncate">{hasValue ? display : placeholder}</span>
      </button>
      <PayDateEditor
        open={open}
        anchorRef={anchorRef}
        value={iso || value}
        onClose={() => setOpen(false)}
        onCommit={onChange}
      />
    </div>
  )
}
