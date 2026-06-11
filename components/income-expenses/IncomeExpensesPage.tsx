'use client'

import Link from 'next/link'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { cn } from '@/lib/utils'
import { useUserPrefs } from '@/lib/userPrefs'
import { ExpensesColumn } from './ExpensesColumn'
import { IncomeColumn } from './IncomeColumn'
import { SummaryCards } from './SummaryCards'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export function IncomeExpensesPage() {
  const {
    data,
    isLoaded,
    addCreditor,
    updateCreditor,
    addExpenseCategory,
    addIncomeType,
    addIncome,
    updateIncome,
    totalMonthlyExpenses,
    totalMonthlyIncome,
    netMonthlyPosition,
  } = useMyPayBoard()

  const { prefs } = useUserPrefs()
  // Three tracks: [expense | flexible gap | income]. Stack view uses 45% / 45%
  // with a ~10% center channel. List view lets the wider table grow into that
  // gap; income stays right-pinned at 45%. When both are list, bills still
  // expands (52%) while income holds at 45% — the middle track keeps the gap.
  const columnsClass = (() => {
    const expenseList = prefs.expenseView === 'list'
    const incomeList = prefs.incomeView === 'list'
    if (expenseList && incomeList) return 'xl:grid-cols-[52%_minmax(2rem,1fr)_45%]'
    if (expenseList) return 'xl:grid-cols-[52%_1fr_45%]'
    if (incomeList) return 'xl:grid-cols-[45%_1fr_52%]'
    return 'xl:grid-cols-[45%_1fr_45%]'
  })()

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary) shadow-(--shadow-sm)">
        Loading income and expenses...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
          Bills &amp; Income
        </h1>
        <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-(--text-secondary)">
          Overview of recurring expenses and income sources for your household
        </p>
        <p className="mt-1.5 text-[12px] text-(--text-tertiary)">
          Group order and names are managed in{' '}
          <Link
            href={DASHBOARD_PATHS.settingsOrganize}
            className="text-(--text-tertiary) underline decoration-[color-mix(in_srgb,var(--text-tertiary)_40%,transparent)] underline-offset-2 transition duration-200 ease-out hover:text-(--navy) hover:decoration-(--navy)"
          >
            Organize Lists
          </Link>
          .
        </p>
      </header>

      <SummaryCards
        totalMonthlyExpenses={totalMonthlyExpenses}
        totalMonthlyIncome={totalMonthlyIncome}
        netMonthlyPosition={netMonthlyPosition}
      />

      <div
        className={cn(
          'grid grid-cols-1 gap-y-6 pt-8 transition-[grid-template-columns] duration-200 ease-out',
          columnsClass
        )}
      >
        <div className="min-w-0 xl:col-start-1">
          <ExpensesColumn
            creditors={data.creditors}
            expenseCategories={data.expenseCategories}
            addCreditor={addCreditor}
            updateCreditor={updateCreditor}
            addExpenseCategory={addExpenseCategory}
          />
        </div>
        <div className="min-w-0 xl:col-start-3">
          <IncomeColumn
            incomes={data.incomes}
            incomeCategories={data.incomeCategories}
            addIncomeType={addIncomeType}
            addIncome={addIncome}
            updateIncome={updateIncome}
          />
        </div>
      </div>
    </div>
  )
}
