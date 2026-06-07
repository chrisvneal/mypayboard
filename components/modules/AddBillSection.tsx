'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddBillInline, type AddBillInlineProps } from './AddBillInline'

type AddBillSectionProps = Omit<AddBillInlineProps, 'onCancel' | 'onHeightChange'> & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddBillSection({
  open,
  onOpenChange,
  onAdd,
  ...addBillProps
}: AddBillSectionProps) {
  return (
    <div className="module-add-bill-zone">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className={cn(
          'add-bill-row group flex w-full items-center gap-2 py-2.5 text-[13px] font-normal text-(--text-tertiary)',
          open ? 'text-(--text-secondary)' : 'hover:text-(--text-secondary)'
        )}
      >
        <Plus
          className={cn(
            'size-3.5 shrink-0 opacity-70 transition-[transform,opacity,color] duration-150 ease-out group-hover:opacity-100',
            open && 'rotate-45'
          )}
          aria-hidden
        />
        <span>{open ? 'Cancel' : 'Add bill'}</span>
      </button>

      <AddBillInline
        open={open}
        onAdd={onAdd}
        onCancel={() => onOpenChange(false)}
        {...addBillProps}
      />
    </div>
  )
}