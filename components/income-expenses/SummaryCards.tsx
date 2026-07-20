'use client'

import { Receipt, TrendingUp, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { SummaryStatCard } from '@/components/ui/SummaryStatCard'

type SummaryCardsProps = {
  totalMonthlyExpenses: number
  totalMonthlyIncome: number
  netMonthlyPosition: number
  /** Overrides for non-Bills-&-Income contexts (e.g. per-board summary). Defaults match Bills & Income wording. */
  expensesLabel?: string
  incomeLabel?: string
  netLabel?: string
}

export function SummaryCards({
  totalMonthlyExpenses,
  totalMonthlyIncome,
  netMonthlyPosition,
  expensesLabel = 'TOTAL MONTHLY EXPENSES',
  incomeLabel = 'TOTAL MONTHLY INCOME',
  netLabel = 'NET MONTHLY POSITION',
}: SummaryCardsProps) {
  const netPositive = netMonthlyPosition >= 0

  return (
    <div className="flex flex-wrap gap-4 sm:gap-6">
      <SummaryStatCard
        className="w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0"
        label={expensesLabel}
        value={formatCurrency(totalMonthlyExpenses)}
        icon={Receipt}
        iconVariant="navy"
      />
      <SummaryStatCard
        className="w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0"
        label={incomeLabel}
        value={formatCurrency(totalMonthlyIncome)}
        icon={Wallet}
        iconVariant="green"
        valueTone="green"
      />
      <SummaryStatCard
        className="w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0"
        label={netLabel}
        value={formatCurrency(netMonthlyPosition)}
        icon={TrendingUp}
        iconVariant="amber"
        valueTone={netPositive ? 'green' : 'danger'}
      />
    </div>
  )
}
