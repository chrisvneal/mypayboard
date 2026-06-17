'use client'

import { CalendarClock, CircleDollarSign, CreditCard, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { SummaryStatCard } from '@/components/ui/SummaryStatCard'

type DebtSummaryCardsProps = {
  totalDebt: number
  totalMinPayments: number
  totalAvailableCredit: number
  totalCreditLimit: number
}

export function DebtSummaryCards({
  totalDebt,
  totalMinPayments,
  totalAvailableCredit,
  totalCreditLimit,
}: DebtSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SummaryStatCard
        className="p-4"
        label="TOTAL DEBT"
        value={formatCurrency(totalDebt)}
        icon={TrendingDown}
        iconVariant="navy"
        valueTone="danger"
      />
      <SummaryStatCard
        className="p-4"
        label="TOTAL MINIMUM PAYMENTS"
        value={formatCurrency(totalMinPayments)}
        icon={CalendarClock}
        iconVariant="neutral"
      />
      <SummaryStatCard
        className="p-4"
        label="TOTAL AVAILABLE CREDIT"
        value={formatCurrency(totalAvailableCredit)}
        icon={CircleDollarSign}
        iconVariant="green"
        valueTone="green"
      />
      <SummaryStatCard
        className="p-4"
        label="TOTAL CREDIT LIMIT"
        value={formatCurrency(totalCreditLimit)}
        icon={CreditCard}
        iconVariant="amber"
      />
    </div>
  )
}
