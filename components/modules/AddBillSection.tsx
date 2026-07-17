'use client'

import { useState } from 'react'
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
  const [hasUnsavedCategory, setHasUnsavedCategory] = useState(false)

  return (
    <div className="module-add-bill-zone">
      <div className="add-bill-row flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className={cn(
            'group flex items-center gap-2 py-2.5 text-[13px] font-normal text-(--text-tertiary)',
            open ? 'text-(--text-secondary)' : 'hover:text-(--text-secondary)'
          )}
        >
          <Plus
            className="size-3.5 shrink-0 opacity-70 group-hover:opacity-100"
            style={{
              transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            aria-hidden
          />
          <span>{open ? 'Cancel' : 'Add bill'}</span>
        </button>
        {open && hasUnsavedCategory ? (
          <span className="text-[10px] font-medium text-(--green)">Press Enter to save</span>
        ) : null}
      </div>

      <AddBillInline
        open={open}
        onAdd={onAdd}
        onCancel={() => onOpenChange(false)}
        onUnsavedCategoryChange={setHasUnsavedCategory}
        {...addBillProps}
      />
    </div>
  )
}
