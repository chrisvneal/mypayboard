'use client'

import { formatCurrency } from '@/lib/format'

type DebtSummaryCardsProps = {
  totalDebt: number
  totalMinPayments: number
  totalAvailableCredit: number
  totalCreditLimit: number
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <section
      className="rounded-lg border border-[--module-divider-color] border-l-4 bg-(--bg-primary) p-3 shadow-(--shadow-sm)"
      style={{ borderLeftColor: accent }}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-(--text-tertiary)">{label}</div>
      <div className="mt-2 text-2xl font-bold leading-tight tracking-[-0.02em] tabular-nums text-(--text-primary)">
        {value}
      </div>
    </section>
  )
}

export function DebtSummaryCards({
  totalDebt,
  totalMinPayments,
  totalAvailableCredit,
  totalCreditLimit,
}: DebtSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard label="TOTAL DEBT" value={formatCurrency(totalDebt)} accent="var(--navy)" />
      <SummaryCard
        label="TOTAL MINIMUM PAYMENTS"
        value={formatCurrency(totalMinPayments)}
        accent="var(--navy)"
      />
      <SummaryCard
        label="TOTAL AVAILABLE CREDIT"
        value={formatCurrency(totalAvailableCredit)}
        accent="var(--green)"
      />
      <SummaryCard label="TOTAL CREDIT LIMIT" value={formatCurrency(totalCreditLimit)} accent="var(--green)" />
    </div>
  )
}
