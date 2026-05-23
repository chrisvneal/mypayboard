import { MonthlyBoard } from '@/components/board/MonthlyBoard'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
          Current Month
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-(--text-secondary)">
          Reorder bills within a paycheck or manage your monthly plan from each module menu.
        </p>
      </header>
      <MonthlyBoard />
    </div>
  )
}
