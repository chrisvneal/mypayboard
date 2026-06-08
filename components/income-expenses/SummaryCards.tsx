'use client'

import { Receipt, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

type SummaryCardsProps = {
  totalMonthlyExpenses: number
  totalMonthlyIncome: number
  netMonthlyPosition: number
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
    <section className="w-max shrink-0 rounded-lg border-[0.5px] border-[--module-divider-color] bg-white p-4">
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

export function SummaryCards({
  totalMonthlyExpenses,
  totalMonthlyIncome,
  netMonthlyPosition,
}: SummaryCardsProps) {
  const netPositive = netMonthlyPosition >= 0

  return (
    <div className="flex flex-wrap gap-4">
      <SummaryCard
        label="TOTAL MONTHLY EXPENSES"
        value={formatCurrency(totalMonthlyExpenses)}
        icon={Receipt}
        iconBg="#E6F1FB"
        iconColor="#185FA5"
      />
      <SummaryCard
        label="TOTAL MONTHLY INCOME"
        value={formatCurrency(totalMonthlyIncome)}
        icon={Wallet}
        iconBg="#EAF3DE"
        iconColor="#3B6D11"
        valueColor="#3B6D11"
      />
      <SummaryCard
        label="NET MONTHLY POSITION"
        value={formatCurrency(netMonthlyPosition)}
        icon={TrendingUp}
        iconBg="#FAEEDA"
        iconColor="#854F0B"
        valueColor={netPositive ? '#3B6D11' : '#A32D2D'}
      />
    </div>
  )
}
