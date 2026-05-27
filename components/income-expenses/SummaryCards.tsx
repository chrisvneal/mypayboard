'use client'

import { formatCurrency } from '@/lib/format'

type SummaryCardsProps = {
  totalMonthlyExpenses: number
  totalMonthlyIncome: number
  netMonthlyPosition: number
}

function SummaryCard({
  label,
  value,
  accent,
  valueClassName = 'text-(--text-primary)',
}: {
  label: string
  value: string
  accent: string
  valueClassName?: string
}) {
  return (
    <section
      className="rounded-lg border border-[--module-divider-color] border-l-4 bg-(--bg-primary) p-3 shadow-(--shadow-sm)"
      style={{ borderLeftColor: accent }}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-(--text-tertiary)">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold leading-tight tracking-[-0.02em] tabular-nums ${valueClassName}`}>
        {value}
      </div>
    </section>
  )
}

export function SummaryCards({
  totalMonthlyExpenses,
  totalMonthlyIncome,
  netMonthlyPosition,
}: SummaryCardsProps) {
  const netPositive = netMonthlyPosition >= 0

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard
        label="TOTAL MONTHLY EXPENSES"
        value={formatCurrency(totalMonthlyExpenses)}
        accent="var(--navy)"
      />
      <SummaryCard
        label="TOTAL MONTHLY INCOME"
        value={formatCurrency(totalMonthlyIncome)}
        accent="var(--green)"
        valueClassName="text-(--green)"
      />
      <SummaryCard
        label="NET MONTHLY POSITION"
        value={formatCurrency(netMonthlyPosition)}
        accent={netPositive ? 'var(--green)' : 'var(--danger-muted)'}
        valueClassName={netPositive ? 'text-(--green)' : 'text-(--danger-muted)'}
      />
    </div>
  )
}
