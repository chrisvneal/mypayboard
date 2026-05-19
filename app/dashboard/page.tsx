import { MonthlyBoard } from '@/components/board/MonthlyBoard'

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <header className="page-intro">
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
          Current Month
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-(--text-secondary)">
          Drag modules between columns or reorder bills within a paycheck.
        </p>
      </header>
      <MonthlyBoard />
    </div>
  )
}
