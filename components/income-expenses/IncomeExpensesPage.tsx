'use client'

import Link from 'next/link'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { cn } from '@/lib/utils'
import { useUserPrefs } from '@/lib/UserPrefsProvider'
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
  const columnsClass = (() => {
    const expenseList = prefs.expenseView === 'list'
    const incomeList = prefs.incomeView === 'list'
    if (expenseList && incomeList) return 'min-[1563px]:grid-cols-[52fr_45fr]'
    if (expenseList) return 'min-[1563px]:grid-cols-[52fr_45fr]'
    if (incomeList) return 'min-[1563px]:grid-cols-[45fr_52fr]'
    return 'min-[1563px]:grid-cols-[1fr_1fr]'
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
        layout="inline"
      />

      <div
        className={cn(
          'grid grid-cols-1 gap-y-6 min-[1563px]:gap-x-8 transition-[grid-template-columns] duration-200 ease-out',
          columnsClass
        )}
      >
        <div className="min-w-0 md:min-w-[700px] min-[1563px]:min-w-0">
          <ExpensesColumn
            creditors={data.creditors}
            expenseCategories={data.expenseCategories}
            addCreditor={addCreditor}
            updateCreditor={updateCreditor}
            addExpenseCategory={addExpenseCategory}
          />
        </div>
        <div className="min-w-0">
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
