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
    <div className="border-t border-border/40">
      <button
        type="button"
        onClick={onAddBill}
        className={cn(
          'group flex w-full items-center gap-2 border-b border-border/40 px-5 py-2.5 text-[13px] font-normal text-(--text-tertiary) transition-colors duration-150',
          addBillOpen
            ? 'text-(--text-secondary)'
            : 'hover:text-(--text-secondary)'
        )}
      >
        <Plus
          className="size-3.5 shrink-0 opacity-70 transition-colors duration-150 group-hover:opacity-100"
          aria-hidden
        />
        <span>Add bill</span>
      </button>

      <div className="border-t border-border/35 px-5 py-3.5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="section-label block">Total Expenses</span>
            <div className="mt-1 text-[15px] font-semibold tabular-nums text-(--text-primary)">
              {formatCurrency(totalExpenses)}
            </div>
          </div>
          <div className="flex shrink-0 items-start">
            <div className="module-financial-rail">
              <div
                className={cn(
                  'balance-display text-[18px]',
                  balanceToneClass(tone)
                )}
              >
                {formatCurrency(remaining)}
              </div>
              <span className="section-label mt-1.5 block text-right">Remaining</span>
            </div>
            <span className="module-actions-cell" aria-hidden />
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
