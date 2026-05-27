'use client'

import { useMemo, useState } from 'react'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { DebtFilterBar, type DebtTypeFilter } from './DebtFilterBar'
import { DebtSummaryCards } from './DebtSummaryCards'
import { DebtTable } from './DebtTable'

export function DebtOverviewPage() {
  const { data, isLoaded, getDebtTotals } = useMyPayBoard()
  const [typeFilter, setTypeFilter] = useState<DebtTypeFilter>('all')

  const trackedCreditors = useMemo(
    () =>
      data.creditors.filter(
        creditor => creditor.trackDebt === true && creditor.active !== false && !creditor.archived
      ),
    [data.creditors]
  )

  const filteredEntries = useMemo(
    () =>
      typeFilter === 'all'
        ? trackedCreditors
        : trackedCreditors.filter(creditor => (creditor.debtDetail?.type ?? 'revolving') === typeFilter),
    [trackedCreditors, typeFilter]
  )

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary) shadow-(--shadow-sm)">
        Loading debt overview...
      </div>
    )
  }

  const totals = getDebtTotals()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Debt Overview</h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-(--text-secondary)">
          A clear view of your household debt accounts and credit positions.
        </p>
      </header>

      <DebtSummaryCards
        totalDebt={totals.totalDebt}
        totalMinPayments={totals.totalMinPayments}
        totalAvailableCredit={totals.totalAvailableCredit}
        totalCreditLimit={totals.totalCreditLimit}
      />

      <section className="space-y-3">
        <DebtFilterBar value={typeFilter} onChange={setTypeFilter} />
        <DebtTable entries={filteredEntries} />
      </section>
    </div>
  )
}
