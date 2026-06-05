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
  /** Template editor: no checkbox/drag columns */
  compact?: boolean
}

export function ModuleBillTableHeader({
  sortKey,
  sortDirection,
  onToggleSort,
  compact = false,
}: ModuleBillTableHeaderProps) {
  return (
    <div
      className={cn(
        'bill-row-header mt-1 shrink-0 pt-3 pb-2',
        compact && 'bill-row-header--compact'
      )}
    >
      {!compact ? <span aria-hidden className="bill-row-header-check-slot" /> : null}
      {!compact ? <span aria-hidden className="bill-row-header-pipe-slot" /> : null}
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
