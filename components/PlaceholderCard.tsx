'use client'

import { LayoutGrid, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type PlaceholderCardProps = {
  label: string
  description?: string
  onClick: () => void
  className?: string
  /** Use layout icon instead of plus (e.g. first template empty state). */
  icon?: 'plus' | 'layout'
}

export function PlaceholderCard({
  label,
  description,
  onClick,
  className,
  icon = 'plus',
}: PlaceholderCardProps) {
  const Icon = icon === 'layout' ? LayoutGrid : Plus

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[168px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-(--bg-secondary)/60 px-4 py-6 text-center transition duration-200 ease-out hover:border-(--navy)/40 hover:bg-(--navy-light)/45',
        className
      )}
    >
      <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-(--bg-primary) text-(--navy) shadow-(--shadow-sm) transition group-hover:border-(--navy)/30">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[13px] font-medium text-(--text-secondary)">{label}</span>
      {description ? (
        <span className="max-w-[220px] text-[11px] leading-snug text-(--text-tertiary)">{description}</span>
      ) : null}
    </button>
  )
}
