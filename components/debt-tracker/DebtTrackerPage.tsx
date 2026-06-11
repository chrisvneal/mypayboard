'use client'

import { useMemo, useState } from 'react'
import { filterDebtTrackerCreditors } from '@/lib/creditors'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { DebtFilterBar, type DebtTypeFilter } from './DebtFilterBar'
import { DebtSummaryCards } from './DebtSummaryCards'
import { DebtTable } from './DebtTable'

export function DebtTrackerPage() {
  const { data, isLoaded, getDebtTotals } = useMyPayBoard()
  const [typeFilter, setTypeFilter] = useState<DebtTypeFilter>('all')

  const trackedCreditors = useMemo(
    () => filterDebtTrackerCreditors(data.creditors),
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
        Loading debt tracker...
      </div>
    )
  }

  const totals = getDebtTotals()

  const countLabel =
    typeFilter === 'all'
      ? `${trackedCreditors.length} ${trackedCreditors.length === 1 ? 'account' : 'accounts'}`
      : `Showing ${filteredEntries.length} of ${trackedCreditors.length} accounts`

  return (
    <div className="space-y-8">
      <header>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Debt Tracker</h1>
          <span className="text-base font-semibold tabular-nums text-(--text-secondary)">
            {countLabel}
          </span>
        </div>
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
