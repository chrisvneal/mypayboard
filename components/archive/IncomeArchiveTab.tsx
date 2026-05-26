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
    <section
      className="overflow-hidden rounded-lg bg-(--bg-primary)"
      style={{ border: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
    >
      {incomes.map((income, index) => (
        <ArchiveIncomeRow
          key={income.id}
          income={income}
          isLast={index === incomes.length - 1}
          onRestore={() => onRestore(income.id)}
          onDelete={() => onDelete(income.id)}
        />
      ))}
    </section>
  )
}
