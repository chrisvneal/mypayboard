'use client'

import { MonthlyBoard } from '@/components/board/MonthlyBoard'
import { SummaryCards } from '@/components/income-expenses/SummaryCards'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export default function DashboardPage() {
  const { getActiveBoard, getBoardTotals, isLoaded } = useMyPayBoard()
  const activeBoard = getActiveBoard()
  const boardTitle = activeBoard?.label ?? 'Current Month'
  const boardTotals = activeBoard
    ? getBoardTotals(activeBoard)
    : { totalIncome: 0, totalExpenses: 0, overage: 0 }
  const monthName = activeBoard
    ? new Date(activeBoard.year, activeBoard.month - 1, 1)
        .toLocaleString('en-US', { month: 'long' })
        .toUpperCase()
    : 'MONTH'

  return (
    <div className="mx-auto w-full max-w-[1560px]">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
          {isLoaded ? boardTitle : 'Current Month'}
        </h1>
        {isLoaded && activeBoard && (
          <p className="mt-2.5 text-sm leading-relaxed text-(--text-secondary)">
            Reorder bills within a paycheck or manage your monthly plan from each card menu.
          </p>
        )}
      </header>
      {isLoaded && activeBoard && (
        <div className="mb-8">
          <SummaryCards
            totalMonthlyExpenses={boardTotals.totalExpenses}
            totalMonthlyIncome={boardTotals.totalIncome}
            netMonthlyPosition={boardTotals.overage}
            expensesLabel={`TOTAL ${monthName} EXPENSES`}
            incomeLabel={`TOTAL ${monthName} INCOME`}
            netLabel={`ESTIMATED ${monthName} OVERAGE`}
          />
        </div>
      )}
      <MonthlyBoard />
    </div>
  )
}
