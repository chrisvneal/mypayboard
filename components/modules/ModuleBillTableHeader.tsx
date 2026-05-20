'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BillSortKey = 'name' | 'amount' | 'dueDate'
export type BillSortDirection = 'asc' | 'desc'

type SortHeaderButtonProps = {
  label: string
  sortKey: BillSortKey
  activeSortKey: BillSortKey | null
  direction: BillSortDirection
  onToggle: (key: BillSortKey) => void
  className?: string
}

function SortHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onToggle,
  className,
}: SortHeaderButtonProps) {
  const isActive = activeSortKey === sortKey
  const Icon = isActive && direction === 'desc' ? ArrowDown : ArrowUp

  return (
    <button
      type="button"
      className={cn(
        'section-label inline-flex items-center gap-1 transition-colors duration-150 hover:text-(--text-secondary)',
        className
      )}
      onClick={() => onToggle(sortKey)}
    >
      <span>{label}</span>
      <Icon
        className={cn('size-3.5', isActive ? 'text-[#185FA5]' : 'text-(--text-tertiary)')}
        aria-hidden
      />
    </button>
  )
}

export type ModuleBillTableHeaderProps = {
  sortKey: BillSortKey | null
  sortDirection: BillSortDirection
  onToggleSort: (key: BillSortKey) => void
}

export function ModuleBillTableHeader({
  sortKey,
  sortDirection,
  onToggleSort,
}: ModuleBillTableHeaderProps) {
  return (
    <div className="bill-row-header mt-1 shrink-0 px-5 pt-3 pb-2">
      <span aria-hidden />
      <span aria-hidden />
      <span aria-hidden />
      <SortHeaderButton
        label="Bill Name"
        sortKey="name"
        activeSortKey={sortKey}
        direction={sortDirection}
        onToggle={onToggleSort}
        className="min-w-0 justify-start"
      />
      <SortHeaderButton
        label="Due Date"
        sortKey="dueDate"
        activeSortKey={sortKey}
        direction={sortDirection}
        onToggle={onToggleSort}
        className="bill-row-cell-due justify-center"
      />
      <SortHeaderButton
        label="Amount"
        sortKey="amount"
        activeSortKey={sortKey}
        direction={sortDirection}
        onToggle={onToggleSort}
        className="bill-row-cell-amount justify-end text-right"
      />
      <span aria-hidden />
    </div>
  )
}
