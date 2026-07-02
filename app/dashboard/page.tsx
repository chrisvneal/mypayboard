'use client'

import { MonthlyBoard } from '@/components/board/MonthlyBoard'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export default function DashboardPage() {
  const { getActiveBoard, isLoaded } = useMyPayBoard()
  const activeBoard = getActiveBoard()
  const boardTitle = activeBoard?.label ?? 'Current Month'

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-(--text-primary)">
          {isLoaded ? boardTitle : 'Current Month'}
        </h1>
        {activeBoard && (
          <p className="mt-2.5 text-sm leading-relaxed text-(--text-secondary)">
            Reorder bills within a paycheck or manage your monthly plan from each card menu.
          </p>
        )}
      </header>
      <MonthlyBoard />
    </div>
  )
}
