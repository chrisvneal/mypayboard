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
  /**
   * 'stacked' (default) — original Bills & Income block treatment.
   * 'inline' — slimmer single-line "semi" cards, same styling, less vertical weight.
   */
  layout?: 'stacked' | 'inline'
}

export function SummaryCards({
  totalMonthlyExpenses,
  totalMonthlyIncome,
  netMonthlyPosition,
  expensesLabel = 'TOTAL MONTHLY EXPENSES',
  incomeLabel = 'TOTAL MONTHLY INCOME',
  netLabel = 'NET MONTHLY POSITION',
  layout = 'stacked',
}: SummaryCardsProps) {
  const netPositive = netMonthlyPosition >= 0
  const cardClassName =
    layout === 'inline'
      ? 'w-full py-2.5 pl-3 pr-4 sm:flex-1 sm:min-w-[13rem]'
      : 'w-full py-4 pl-4 pr-6 sm:w-max sm:min-w-[15rem] sm:shrink-0'

  return (
    <div className="flex flex-wrap gap-4 sm:gap-6">
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label={expensesLabel}
        value={formatCurrency(totalMonthlyExpenses)}
        icon={Receipt}
        iconVariant="navy"
      />
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label={incomeLabel}
        value={formatCurrency(totalMonthlyIncome)}
        icon={Wallet}
        iconVariant="green"
        valueTone="green"
      />
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label={netLabel}
        value={formatCurrency(netMonthlyPosition)}
        icon={TrendingUp}
        iconVariant="amber"
        valueTone={netPositive ? 'green' : 'danger'}
      />
    </div>
  )
}
