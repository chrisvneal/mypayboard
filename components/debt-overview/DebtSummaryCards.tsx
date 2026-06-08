'use client'

import { CalendarClock, CircleDollarSign, CreditCard, TrendingDown, type LucideIcon } from 'lucide-react'
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
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  label: string
  value: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  valueColor?: string
}) {
  return (
    <section className="rounded-lg border-[0.5px] border-[--module-divider-color] bg-white p-4">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={18} strokeWidth={2} style={{ color: iconColor }} />
      </div>
      <div className="mt-3 text-[10px] font-medium uppercase tracking-wider text-(--text-tertiary)">
        {label}
      </div>
      <div
        className="mt-2 text-[22px] font-medium leading-tight tracking-[-0.02em] tabular-nums"
        style={{ color: valueColor ?? 'var(--text-primary)' }}
      >
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
      <SummaryCard
        label="TOTAL DEBT"
        value={formatCurrency(totalDebt)}
        icon={TrendingDown}
        iconBg="#E6F1FB"
        iconColor="#185FA5"
        valueColor="#A32D2D"
      />
      <SummaryCard
        label="TOTAL MINIMUM PAYMENTS"
        value={formatCurrency(totalMinPayments)}
        icon={CalendarClock}
        iconBg="#F1EFE8"
        iconColor="#5F5E5A"
      />
      <SummaryCard
        label="TOTAL AVAILABLE CREDIT"
        value={formatCurrency(totalAvailableCredit)}
        icon={CircleDollarSign}
        iconBg="#EAF3DE"
        iconColor="#3B6D11"
        valueColor="#3B6D11"
      />
      <SummaryCard
        label="TOTAL CREDIT LIMIT"
        value={formatCurrency(totalCreditLimit)}
        icon={CreditCard}
        iconBg="#FAEEDA"
        iconColor="#854F0B"
      />
    </div>
  )
}
