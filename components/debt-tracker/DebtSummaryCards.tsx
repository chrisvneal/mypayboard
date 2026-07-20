'use client'

import { CalendarClock, CircleDollarSign, CreditCard, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { SummaryStatCard } from '@/components/ui/SummaryStatCard'

type DebtSummaryCardsProps = {
  totalDebt: number
  totalMinPayments: number
  totalAvailableCredit: number
  totalCreditLimit: number
  /**
   * 'stacked' (default) — original block treatment. 'inline' — slimmer
   * single-line "semi" cards, same styling used on the Pay Board summary header.
   */
  layout?: 'stacked' | 'inline'
}

export function DebtSummaryCards({
  totalDebt,
  totalMinPayments,
  totalAvailableCredit,
  totalCreditLimit,
  layout = 'stacked',
}: DebtSummaryCardsProps) {
  const isInline = layout === 'inline'
  const containerClassName = isInline
    ? 'flex flex-wrap gap-4 sm:gap-6'
    : 'grid grid-cols-2 gap-4 lg:grid-cols-4'
  const cardClassName = isInline
    ? 'w-full py-2.5 pl-3 pr-4 sm:flex-1 sm:min-w-[13rem]'
    : 'p-4'

  return (
    <div className={containerClassName}>
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label="TOTAL DEBT"
        value={formatCurrency(totalDebt)}
        icon={TrendingDown}
        iconVariant="navy"
        valueTone="danger"
      />
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label="TOTAL MINIMUM PAYMENTS"
        value={formatCurrency(totalMinPayments)}
        icon={CalendarClock}
        iconVariant="neutral"
      />
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label="TOTAL AVAILABLE CREDIT"
        value={formatCurrency(totalAvailableCredit)}
        icon={CircleDollarSign}
        iconVariant="green"
        valueTone="green"
      />
      <SummaryStatCard
        className={cardClassName}
        layout={layout}
        label="TOTAL CREDIT LIMIT"
        value={formatCurrency(totalCreditLimit)}
        icon={CreditCard}
        iconVariant="amber"
      />
    </div>
  )
}
