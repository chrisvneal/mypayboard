'use client'

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

  const { prefs } = useUserPrefs()
  // Three tracks: [expense | flexible gap | income]. Income is right-pinned at a
  // fixed 45%, so it never moves. A column in list view grows ~15% into the
  // middle gap track (which shrinks to absorb it); switching back to stacks
  // retracts it. The shared 1fr gap track lets grid-template-columns transition
  // smoothly. Static class strings so Tailwind's JIT can see them.
  const columnsClass = (() => {
    const expenseList = prefs.expenseView === 'list'
    const incomeList = prefs.incomeView === 'list'
    if (expenseList && incomeList) return 'xl:grid-cols-[50%_1fr_50%]'
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
            removeCreditor={removeCreditor}
            addExpenseCategory={addExpenseCategory}
          />
        </div>
        <div className="min-w-0 xl:col-start-3">
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
    </div>
  )
}
