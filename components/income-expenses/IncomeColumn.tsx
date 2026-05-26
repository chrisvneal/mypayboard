'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Income } from '@/lib/types'
import { CategoryGroup } from './CategoryGroup'
import { IncomeRow } from './IncomeRow'

type IncomeColumnProps = {
  incomes: Income[]
  addIncome: (income: Income) => void
  updateIncome: (incomeId: string, changes: Partial<Income>) => void
  removeIncome: (incomeId: string) => void
  generateId: (prefix?: string) => string
}

const INCOME_GROUPS = [
  { id: 'jobs', label: 'Jobs' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'other', label: 'Other' },
]

function groupKey(group: string): string {
  const normalized = group.toLowerCase()
  if (normalized === 'jobs' || normalized === 'job') return 'jobs'
  if (normalized === 'benefits' || normalized === 'benefit') return 'benefits'
  if (normalized === 'other') return 'other'
  return group
}

function groupLabel(group: string): string {
  const key = groupKey(group)
  return INCOME_GROUPS.find(item => item.id === key)?.label ?? group
}

function visibleIncome(income: Income): boolean {
  return income.active !== false && !income.archived
}

export function IncomeColumn({
  incomes,
  addIncome,
  updateIncome,
  removeIncome,
  generateId,
}: IncomeColumnProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const visibleIncomes = useMemo(() => incomes.filter(visibleIncome), [incomes])

  const groups = useMemo(() => {
    const dynamicGroups = visibleIncomes
      .map(income => groupKey(income.group))
      .filter(key => !INCOME_GROUPS.some(group => group.id === key))

    return [
      ...INCOME_GROUPS,
      ...Array.from(new Set(dynamicGroups)).map(key => ({ id: key, label: groupLabel(key) })),
    ]
  }, [visibleIncomes])

  const handleAddIncome = () => {
    const id = generateId('income')
    addIncome({
      id,
      name: 'New Income',
      group: 'jobs',
      amount: 0,
      frequency: 'monthly',
      owner: 'shared',
      notes: '',
      active: true,
      muted: false,
      archived: false,
    })
    setEditingId(id)
  }

  const saveIncome = (id: string, changes: Partial<Income>) => {
    updateIncome(id, changes)
    setEditingId(null)
  }

  const archiveIncome = (id: string) => {
    updateIncome(id, { archived: true, active: false })
    setEditingId(null)
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-(--text-primary)">Income</h2>
        <div className="mb-5 flex h-8 items-center justify-between">
          <span aria-hidden />
          <button
            type="button"
            onClick={handleAddIncome}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-(--navy) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
          >
            <Plus className="size-3.5" />
            Add Income
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map(group => {
          const items = visibleIncomes.filter(income => groupKey(income.group) === group.id)
          if (items.length === 0) return null
          const subtotal = items
            .filter(income => !income.muted)
            .reduce((sum, income) => sum + income.amount, 0)
          return (
            <CategoryGroup
              key={group.id}
              title={group.label}
              count={items.length}
              total={subtotal}
              totalTone="green"
              countLabel="sources"
            >
              {items.map(income => (
                <IncomeRow
                  key={income.id}
                  income={income}
                  groupLabel={group.label}
                  isEditing={editingId === income.id}
                  onEditStart={() => setEditingId(income.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={changes => saveIncome(income.id, changes)}
                  onArchive={() => archiveIncome(income.id)}
                  onDelete={() => removeIncome(income.id)}
                />
              ))}
            </CategoryGroup>
          )
        })}
        {visibleIncomes.length === 0 && (
          <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-[13px] text-(--text-tertiary)">
            No active income sources yet.
          </div>
        )}
      </div>
    </section>
  )
}
