'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type AddPayDateCardSlotProps = {
  onClick: () => void
  className?: string
}

export function AddPayDateCardSlot({ onClick, className }: AddPayDateCardSlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-(--bg-secondary)/60 px-4 py-6 text-center transition duration-200 ease-out hover:border-(--navy)/40 hover:bg-(--navy-light)/50',
        className
      )}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-(--bg-primary) text-(--navy) shadow-(--shadow-sm) transition group-hover:border-(--navy)/30 group-hover:bg-(--navy-light)">
        <Plus className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[13px] font-medium text-(--text-secondary) group-hover:text-(--navy)">
        Add pay date card
      </span>
      <span className="max-w-[200px] text-[11px] leading-snug text-(--text-tertiary)">
        Another paycheck column for this template
      </span>
    </button>
  )
}
