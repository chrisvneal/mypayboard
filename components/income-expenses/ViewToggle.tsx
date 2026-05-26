'use client'

import { Grid2X2, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IncomeExpenseView = 'grouped' | 'list'

type ViewToggleProps = {
  value: IncomeExpenseView
  onChange: (view: IncomeExpenseView) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-0.5 shadow-(--shadow-sm)">
      {[
        { id: 'grouped' as const, label: 'Grouped view', icon: Grid2X2 },
        { id: 'list' as const, label: 'List view', icon: List },
      ].map(item => {
        const Icon = item.icon
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)',
              active && 'bg-(--bg-secondary) text-(--navy)'
            )}
            aria-label={item.label}
            aria-pressed={active}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
