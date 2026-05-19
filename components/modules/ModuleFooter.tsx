'use client'

import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { balanceToneClass, getRemainingTone } from './balance-tone'

export type ModuleFooterProps = {
  totalExpenses: number
  remaining: number
  mutedCount: number
  mutedTotal: number
}

export function ModuleFooter({
  totalExpenses,
  remaining,
  mutedCount,
  mutedTotal,
}: ModuleFooterProps) {
  const tone = getRemainingTone(remaining)

  return (
    <div className="module-summary px-5 pt-4 pb-4">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <span className="section-label block">Total Expenses</span>
          <div className="mt-1.5 text-[15px] font-semibold tabular-nums text-(--text-primary)">
            {formatCurrency(totalExpenses)}
          </div>
        </div>
        <div className="flex shrink-0 items-start">
          <div className="module-financial-rail">
            <div className={cn('balance-display text-[18px]', balanceToneClass(tone))}>
              {formatCurrency(remaining)}
            </div>
            <span className="section-label mt-2 block text-right">Remaining</span>
          </div>
          <span className="module-actions-cell" aria-hidden />
        </div>
      </div>

      <div
        className="mt-2.5 flex min-h-[18px] items-start"
        aria-live="polite"
        aria-atomic="true"
      >
        {mutedCount > 0 ? (
          <p className="text-[11px] leading-[18px] text-(--text-tertiary)">
            ({mutedCount} bills muted · {formatCurrency(mutedTotal)} excluded)
          </p>
        ) : null}
      </div>
    </div>
  )
}
