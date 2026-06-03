'use client'

import { LayoutGrid, Plus } from 'lucide-react'
import {
  ADD_PAY_DATE_CARD_CLASS,
  ADD_PAY_DATE_CARD_ICON_CLASS,
} from '@/components/board/add-pay-date-card-styles'
import {
  TEMPLATE_LIST_PLACEHOLDER_CLASS,
  TEMPLATE_LIST_PLACEHOLDER_ICON_CLASS,
} from '@/components/templates/template-list-card-styles'
import { cn } from '@/lib/utils'

type PlaceholderCardProps = {
  label: string
  description?: string
  onClick: () => void
  className?: string
  /** Use layout icon instead of plus (e.g. first template empty state). */
  icon?: 'plus' | 'layout'
  /** Pay-date board add slot vs templates list page. */
  variant?: 'pay-date-board' | 'template-list'
}

export function PlaceholderCard({
  label,
  description,
  onClick,
  className,
  icon = 'plus',
  variant = 'pay-date-board',
}: PlaceholderCardProps) {
  const Icon = icon === 'layout' ? LayoutGrid : Plus
  const isList = variant === 'template-list'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group',
        isList ? TEMPLATE_LIST_PLACEHOLDER_CLASS : ADD_PAY_DATE_CARD_CLASS,
        className
      )}
    >
      <span
        className={isList ? TEMPLATE_LIST_PLACEHOLDER_ICON_CLASS : ADD_PAY_DATE_CARD_ICON_CLASS}
      >
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[13px] font-medium text-(--text-secondary) group-hover:text-(--navy)">
        {label}
      </span>
      {description ? (
        <span className="max-w-[260px] text-[11px] leading-snug text-(--text-tertiary)">{description}</span>
      ) : null}
    </button>
  )
}
