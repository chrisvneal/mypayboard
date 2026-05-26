'use client'

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
    removeCreditor,
    addIncome,
    updateIncome,
    removeIncome,
    generateId,
    totalMonthlyExpenses,
    totalMonthlyIncome,
    netMonthlyPosition,
    mutedExpensesCount,
    mutedExpensesTotal,
  } = useMyPayBoard()

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
          Income &amp; Expenses
        </h1>
        <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-(--text-secondary)">
          Overview of recurring expenses and income sources for your household
        </p>
      </header>

      <SummaryCards
        totalMonthlyExpenses={totalMonthlyExpenses}
        totalMonthlyIncome={totalMonthlyIncome}
        netMonthlyPosition={netMonthlyPosition}
        mutedExpensesCount={mutedExpensesCount}
        mutedExpensesTotal={mutedExpensesTotal}
      />

      <div className="grid grid-cols-1 gap-y-6 xl:grid-cols-[minmax(0,45%)_minmax(0,45%)] xl:justify-between">
        <ExpensesColumn
          creditors={data.creditors}
          addCreditor={addCreditor}
          updateCreditor={updateCreditor}
          removeCreditor={removeCreditor}
          generateId={generateId}
        />
        <IncomeColumn
          incomes={data.incomes}
          addIncome={addIncome}
          updateIncome={updateIncome}
          removeIncome={removeIncome}
          generateId={generateId}
        />
      </div>
    </div>
  )
}
