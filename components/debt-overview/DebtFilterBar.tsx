'use client'

import { cn } from '@/lib/utils'

export type DebtTypeFilter = 'all' | 'revolving' | 'installment'

type DebtFilterBarProps = {
  value: DebtTypeFilter
  onChange: (value: DebtTypeFilter) => void
  totalCount: number
  filteredCount: number
}

const FILTER_OPTIONS: Array<{ value: DebtTypeFilter; label: string }> = [
  { value: 'all', label: 'All Accounts' },
  { value: 'revolving', label: 'Revolving' },
  { value: 'installment', label: 'Installment' },
]

export function DebtFilterBar({ value, onChange, totalCount, filteredCount }: DebtFilterBarProps) {
  const countLabel =
    value === 'all'
      ? `${totalCount} ${totalCount === 1 ? 'account' : 'accounts'}`
      : `Showing ${filteredCount} of ${totalCount} accounts`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="section-label mr-1">Type</span>
      {FILTER_OPTIONS.map(option => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center rounded-md border border-[--module-divider-color] px-3 text-[12px] font-medium shadow-(--shadow-sm) transition duration-200 ease-out',
              selected
                ? 'bg-(--navy-light) text-(--navy)'
                : 'bg-(--bg-primary) text-(--text-secondary) hover:bg-(--bg-secondary) hover:text-(--text-primary)'
            )}
          >
            {option.label}
          </button>
        )
      })}
      <span className="ml-auto text-[13px] font-semibold tabular-nums text-(--text-secondary)">
        {countLabel}
      </span>
    </div>
  )
}
