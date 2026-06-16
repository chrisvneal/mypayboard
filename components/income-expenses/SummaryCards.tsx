'use client'

import { Receipt, TrendingUp, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { SummaryStatCard } from '@/components/ui/SummaryStatCard'

type SummaryCardsProps = {
  totalMonthlyExpenses: number
  totalMonthlyIncome: number
  netMonthlyPosition: number
}

export function SummaryCards({
  totalMonthlyExpenses,
  totalMonthlyIncome,
  netMonthlyPosition,
}: SummaryCardsProps) {
  const netPositive = netMonthlyPosition >= 0

  return (
    <div className="flex flex-wrap gap-4 sm:gap-6">
      <SummaryStatCard
        className="w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0"
        label="TOTAL MONTHLY EXPENSES"
        value={formatCurrency(totalMonthlyExpenses)}
        icon={Receipt}
        iconVariant="navy"
      />
      <SummaryStatCard
        className="w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0"
        label="TOTAL MONTHLY INCOME"
        value={formatCurrency(totalMonthlyIncome)}
        icon={Wallet}
        iconVariant="green"
        valueTone="green"
      />
      <SummaryStatCard
        className="w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0"
        label="NET MONTHLY POSITION"
        value={formatCurrency(netMonthlyPosition)}
        icon={TrendingUp}
        iconVariant="amber"
        valueTone={netPositive ? 'green' : 'danger'}
      />
    </div>
  )
}
