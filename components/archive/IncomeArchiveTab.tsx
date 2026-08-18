'use client'

import type { Income } from '@/lib/types'
import { ArchiveClearAllButton } from './ArchiveClearAllButton'
import { ArchiveEmptyState } from './ArchiveEmptyState'
import { ArchiveIncomeRow } from './ArchiveIncomeRow'

type IncomeArchiveTabProps = {
  incomes: Income[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function IncomeArchiveTab({ incomes, onRestore, onDelete, onClearAll }: IncomeArchiveTabProps) {
  if (incomes.length === 0) {
    return (
      <ArchiveEmptyState
        title="No archived income sources."
        description="Income sources you archive will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ArchiveClearAllButton count={incomes.length} itemLabel="income source" onConfirm={onClearAll} />
      </div>
      <section
        className="overflow-hidden rounded-lg bg-(--bg-primary)"
        style={{ border: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
      >
        {incomes.map((income, index) => (
          <ArchiveIncomeRow
            key={income.id}
            income={income}
            isFirst={index === 0}
            isLast={index === incomes.length - 1}
            onRestore={() => onRestore(income.id)}
            onDelete={() => onDelete(income.id)}
          />
        ))}
      </section>
    </div>
  )
}
