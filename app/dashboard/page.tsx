import { MonthlyBoard } from '@/components/board/MonthlyBoard'

export default function DashboardPage() {
  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
          Current Month
        </h1>
        <p className="mt-1 text-[13px] text-(--text-secondary)">
          Drag modules between columns or reorder bills within a paycheck.
        </p>
      </div>
      <MonthlyBoard />
    </div>
  )
}
