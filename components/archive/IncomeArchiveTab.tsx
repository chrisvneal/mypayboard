'use client'

import type { Income } from '@/lib/types'
import { ArchiveEmptyState } from './ArchiveEmptyState'
import { ArchiveIncomeRow } from './ArchiveIncomeRow'

type IncomeArchiveTabProps = {
  incomes: Income[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function IncomeArchiveTab({ incomes, onRestore, onDelete }: IncomeArchiveTabProps) {
  if (incomes.length === 0) {
    return (
      <ArchiveEmptyState
        title="No archived income sources."
        description="Income sources you archive will appear here."
      />
    )
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
      <div className="flex items-baseline justify-between gap-3 bg-(--navy-light) px-4 py-3">
        <h3 className="truncate text-[14px] font-semibold text-(--text-primary)">Income Sources</h3>
        <span className="shrink-0 text-[12px] font-medium text-(--text-secondary)">
          {incomes.length} archived
        </span>
      </div>
      <div className="border-t border-[--module-divider-color]">
        {incomes.map(income => (
          <ArchiveIncomeRow
            key={income.id}
            income={income}
            onRestore={() => onRestore(income.id)}
            onDelete={() => onDelete(income.id)}
          />
        ))}
      </div>
    </section>
  )
}
