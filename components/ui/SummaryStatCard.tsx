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
}

export function SummaryStatCard({
  label,
  value,
  icon: Icon,
  iconVariant,
  valueTone = 'default',
  className,
}: SummaryStatCardProps) {
  return (
    <section
      className={cn(
        'summary-card rounded-lg border-[0.5px] border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)',
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
          'summary-card-value mt-2 text-[22px] font-medium leading-tight tracking-[-0.02em] tabular-nums',
          valueTone === 'green' && 'summary-card-value--green',
          valueTone === 'danger' && 'summary-card-value--danger'
        )}
      >
        {value}
      </div>
    </section>
  )
}
