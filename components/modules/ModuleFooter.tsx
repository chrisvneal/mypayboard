'use client'

import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { balanceToneClass, getRemainingTone } from './balance-tone'

export type ModuleFooterProps = {
  totalExpenses: number
  remaining: number
  mutedCount: number
  mutedTotal: number
  onAddBill: () => void
}

export function ModuleFooter({
  totalExpenses,
  remaining,
  mutedCount,
  mutedTotal,
  onAddBill,
}: ModuleFooterProps) {
  const tone = getRemainingTone(remaining)

  return (
    <div className="border-t border-border px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="section-label">Total Expenses:</span>
          <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
            {formatCurrency(totalExpenses)}
          </div>
        </div>
        <div className="text-right">
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
        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
          ({mutedCount} bills muted · {formatCurrency(mutedTotal)} excluded)
        </p>
      )}

      <button
        type="button"
        className="mt-2 text-[13px] font-medium text-[var(--navy)] transition-colors hover:underline"
        onClick={onAddBill}
      >
        + Add bill
      </button>
    </div>
  )
}
