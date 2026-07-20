'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SummaryCardIconVariant = 'navy' | 'green' | 'amber' | 'neutral'
export type SummaryCardValueTone = 'default' | 'green' | 'danger'

type SummaryStatCardProps = {
  label: string
  value: string
  icon: LucideIcon
  iconVariant: SummaryCardIconVariant
  valueTone?: SummaryCardValueTone
  className?: string
  /**
   * 'stacked' (default) — icon-over-label-over-value, the original Bills & Income
   * treatment. 'inline' — icon, label, and value share a single slim row; same
   * card shape/icon-square/label/value styling, just laid out horizontally.
   */
  layout?: 'stacked' | 'inline'
}

export function SummaryStatCard({
  label,
  value,
  icon: Icon,
  iconVariant,
  valueTone = 'default',
  className,
  layout = 'stacked',
}: SummaryStatCardProps) {
  if (layout === 'inline') {
    return (
      <section
        className={cn(
          'summary-card flex items-center gap-3 rounded-md border-[0.5px] border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)',
          className
        )}
      >
        <div
          className={cn(
            'summary-card-icon shrink-0',
            `summary-card-icon--${iconVariant}`,
            'summary-card-icon--sm'
          )}
        >
          <Icon size={15} strokeWidth={2} />
        </div>
        <div className="summary-card-label-strong min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </div>
        <div
          className={cn(
            'summary-card-value font-financial shrink-0 text-[18px] font-semibold leading-tight tracking-[-0.02em]',
            valueTone === 'green' && 'summary-card-value--green',
            valueTone === 'danger' && 'summary-card-value--danger'
          )}
        >
          {value}
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        'summary-card rounded-md border-[0.5px] border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)',
        className
      )}
    >
      <div className={cn('summary-card-icon', `summary-card-icon--${iconVariant}`)}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="summary-card-label mt-3 text-[10px] font-medium uppercase tracking-wider">
        {label}
      </div>
      <div
        className={cn(
          'summary-card-value font-financial mt-2 text-[22px] font-medium leading-tight tracking-[-0.02em]',
          valueTone === 'green' && 'summary-card-value--green',
          valueTone === 'danger' && 'summary-card-value--danger'
        )}
      >
        {value}
      </div>
    </section>
  )
}
