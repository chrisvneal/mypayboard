'use client'

import { ChevronsUpDown, Grid2X2, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IncomeExpenseView = 'grouped' | 'list'

type ViewToggleProps = {
  value: IncomeExpenseView
  onChange: (view: IncomeExpenseView) => void
  onToggleAll?: () => void
  allCollapsed?: boolean
  collapseDisabled?: boolean
}

function IconTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-2 py-1 text-[11px] font-medium text-(--text-secondary) opacity-0 shadow-(--shadow-sm) transition-opacity delay-300 duration-200 ease-out group-hover/toolbar-tip:opacity-100">
      {label}
    </span>
  )
}

export function ViewToggle({
  value,
  onChange,
  onToggleAll,
  allCollapsed = false,
  collapseDisabled = false,
}: ViewToggleProps) {
  const bulkLabel = allCollapsed ? 'Expand all' : 'Collapse all'

  return (
    <div className="inline-flex items-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-0.5 shadow-(--shadow-sm)">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'toolbar-toggle-btn group/toolbar-tip relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md',
          value === 'list' && 'is-active'
        )}
        aria-label="List view"
        aria-pressed={value === 'list'}
      >
        <List className="size-3.5" />
        <IconTooltip label="List view" />
      </button>
      <span className="mx-1 h-4 w-px bg-[--module-divider-color]" aria-hidden />
      <button
        type="button"
        onClick={() => onChange('grouped')}
        className={cn(
          'toolbar-toggle-btn group/toolbar-tip relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md',
          value === 'grouped' && 'is-active'
        )}
        aria-label="Stacked view"
        aria-pressed={value === 'grouped'}
      >
        <Grid2X2 className="size-3.5" />
        <IconTooltip label="Stacked view" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (!collapseDisabled) onToggleAll?.()
        }}
        className={cn(
          'toolbar-toggle-btn group/toolbar-tip relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md',
          collapseDisabled && 'cursor-default opacity-45 hover:bg-transparent hover:text-(--text-tertiary)'
        )}
        aria-label={bulkLabel}
        aria-disabled={collapseDisabled}
        aria-pressed={!collapseDisabled && allCollapsed}
      >
        <ChevronsUpDown className="size-3.5" />
        {!collapseDisabled && <IconTooltip label={bulkLabel} />}
      </button>
    </div>
  )
}
