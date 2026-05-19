'use client'

import { Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { balanceToneClass, getRemainingTone } from './balance-tone'

export type ModuleFooterProps = {
  totalExpenses: number
  remaining: number
  mutedCount: number
  mutedTotal: number
  onAddBill: () => void
  addBillOpen?: boolean
}

export function ModuleFooter({
  totalExpenses,
  remaining,
  mutedCount,
  mutedTotal,
  onAddBill,
  addBillOpen,
}: ModuleFooterProps) {
  const tone = getRemainingTone(remaining)

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={onAddBill}
        className={cn(
          'group flex w-full items-center gap-2 border-b border-border/50 px-4 py-2 text-[13px] font-medium transition-[background-color,color] duration-150',
          addBillOpen
            ? 'bg-(--green-light) text-(--green-dark)'
            : 'text-(--text-tertiary) hover:bg-(--green-light) hover:text-(--green-dark)'
        )}
      >
        <Plus
          className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-105"
          aria-hidden
        />
        <span>Add bill</span>
      </button>

      <div className="px-5 py-3">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="section-label">Total Expenses:</span>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-(--text-primary)">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
          <div className="pr-3 text-right">
            <span className="section-label">Remaining:</span>
            <div
              className={cn(
                'balance-display mt-0.5 text-[18px] tabular-nums',
                balanceToneClass(tone)
              )}
            >
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        {mutedCount > 0 && (
          <p className="mt-1 text-[11px] text-(--text-tertiary)">
            ({mutedCount} bills muted · {formatCurrency(mutedTotal)} excluded)
          </p>
        )}
      </div>
    </div>
  )
}
