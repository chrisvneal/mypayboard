'use client'

import { Plus } from 'lucide-react'
import {
  ADD_PAY_DATE_CARD_CLASS,
  ADD_PAY_DATE_CARD_ICON_CLASS,
} from '@/components/board/add-pay-date-card-styles'
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
      className={cn('group', ADD_PAY_DATE_CARD_CLASS, className)}
    >
      <span className={ADD_PAY_DATE_CARD_ICON_CLASS}>
        <Plus className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[13px] font-medium text-(--text-secondary) group-hover:text-(--navy)">
        Add pay date card
      </span>
      <span className="max-w-[260px] text-[11px] leading-snug text-(--text-tertiary)">
        Another paycheck column for this month
      </span>
    </button>
  )
}
