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
    addExpenseCategory,
    addIncomeType,
    addIncome,
    updateIncome,
    removeIncome,
    totalMonthlyExpenses,
    totalMonthlyIncome,
    netMonthlyPosition,
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
          Expenses &amp; Income
        </h1>
        <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-(--text-secondary)">
          Overview of recurring expenses and income sources for your household
        </p>
      </header>

      <SummaryCards
        totalMonthlyExpenses={totalMonthlyExpenses}
        totalMonthlyIncome={totalMonthlyIncome}
        netMonthlyPosition={netMonthlyPosition}
      />

      <div className="grid grid-cols-1 gap-y-6 pt-8 xl:grid-cols-[minmax(0,45%)_minmax(0,45%)] xl:justify-between">
        <ExpensesColumn
          creditors={data.creditors}
          expenseCategories={data.expenseCategories}
          addCreditor={addCreditor}
          updateCreditor={updateCreditor}
          removeCreditor={removeCreditor}
          addExpenseCategory={addExpenseCategory}
        />
        <IncomeColumn
          incomes={data.incomes}
          incomeTypes={data.incomeTypes}
          addIncomeType={addIncomeType}
          addIncome={addIncome}
          updateIncome={updateIncome}
          removeIncome={removeIncome}
        />
      </div>
    </div>
  )
}
