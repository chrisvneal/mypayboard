'use client'

import { formatCurrency } from '@/lib/format'
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
  const showMuted = mutedCount > 0

  return (
    <div className="module-summary px-5 pt-4 pb-4">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <div className="font-financial text-lg font-medium text-(--text-primary)">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="section-label font-financial mt-2 block">Total Expenses</span>
          <div
            className="module-footer-muted-slot"
            data-open={showMuted ? 'true' : 'false'}
          >
            <div>
              {showMuted && (
                <p
                  className="mt-1.5 text-xs leading-snug text-(--text-secondary)"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {mutedCount} muted · {formatCurrency(mutedTotal)} excluded
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-start">
          <div className="module-financial-rail font-financial">
            <div className={cn('balance-display text-lg', balanceToneClass(tone))}>
              {formatCurrency(remaining)}
            </div>
            <span className="section-label mt-2 block text-right">Remaining</span>
          </div>
          <span className="module-actions-cell hidden xl:block" aria-hidden />
        </div>
      </div>
    </div>
  )
}
