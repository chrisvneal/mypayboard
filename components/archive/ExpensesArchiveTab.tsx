'use client'

import { useMemo } from 'react'
import {
  EXPENSE_CATEGORY_GROUPS,
  categoryKey,
  categoryLabel,
} from '@/lib/creditors'
import type { Creditor } from '@/lib/types'
import { ArchiveEmptyState } from './ArchiveEmptyState'
import { ArchiveExpenseRow } from './ArchiveExpenseRow'

type ExpensesArchiveTabProps = {
  creditors: Creditor[]
  expenseCategories: string[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

type ArchivedExpense = {
  creditor: Creditor
  label: string
  sortIndex: number
}

export function ExpensesArchiveTab({
  creditors,
  expenseCategories,
  onRestore,
  onDelete,
}: ExpensesArchiveTabProps) {
  const expenses = useMemo<ArchivedExpense[]>(() => {
    const baseOrder: string[] = EXPENSE_CATEGORY_GROUPS.map(group => group.id)
    return creditors
      .map(creditor => {
        const category = String(creditor.category)
        const key = categoryKey(category)
        const sortIndex = baseOrder.indexOf(key)
        return {
          creditor,
          label: categoryLabel(category, { customCategories: expenseCategories }),
          sortIndex: sortIndex === -1 ? Number.MAX_SAFE_INTEGER : sortIndex,
        }
      })
      .sort((a, z) => {
        if (a.sortIndex !== z.sortIndex) return a.sortIndex - z.sortIndex
        if (a.label !== z.label) return a.label.localeCompare(z.label)
        return a.creditor.name.localeCompare(z.creditor.name)
      })
  }, [creditors, expenseCategories])

  if (creditors.length === 0) {
    return (
      <ArchiveEmptyState
        title="No archived bills."
        description="Bills you archive will appear here."
      />
    )
  }

  return (
    <section
      className="overflow-hidden rounded-lg bg-(--bg-primary)"
      style={{ border: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
    >
      {expenses.map(({ creditor, label }, index) => (
        <ArchiveExpenseRow
          key={creditor.id}
          creditor={creditor}
          categoryLabel={label}
          isLast={index === expenses.length - 1}
          onRestore={() => onRestore(creditor.id)}
          onDelete={() => onDelete(creditor.id)}
        />
      ))}
    </section>
  )
}
