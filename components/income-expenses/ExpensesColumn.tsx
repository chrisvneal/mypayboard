'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { CategoryGroup } from './CategoryGroup'
import { readDisplayPrefs, type ExpenseDisplayPrefs } from './DisplayToggle'
import { ExpenseListView } from './ExpenseListView'
import { ExpenseRow } from './ExpenseRow'
import { ViewToggle, type IncomeExpenseView } from './ViewToggle'

type ExpensesColumnProps = {
  creditors: Creditor[]
  expenseCategories: string[]
  addCreditor: (creditor: Creditor) => void
  updateCreditor: (creditorId: string, changes: Partial<Creditor>) => void
  removeCreditor: (creditorId: string) => void
  addExpenseCategory: (category: string) => void
  generateId: (prefix?: string) => string
}

const BASE_GROUPS = [
  { id: 'living', label: 'Living Expenses' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'savings', label: 'Savings' },
  { id: 'creditors', label: 'Creditors' },
]

function categoryKey(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living expenses' || normalized === 'living') return 'living'
  if (normalized === 'subscriptions' || normalized === 'subscription') return 'subscriptions'
  if (normalized === 'savings' || normalized === 'saving') return 'savings'
  if (normalized === 'creditors' || normalized === 'creditor') return 'creditors'
  return category
}

function categoryLabel(category: string): string {
  const key = categoryKey(category)
  return BASE_GROUPS.find(group => group.id === key)?.label ?? category
}

function visibleCreditor(creditor: Creditor): boolean {
  return creditor.active !== false && !creditor.archived
}

export function ExpensesColumn({
  creditors,
  expenseCategories,
  addCreditor,
  updateCreditor,
  removeCreditor,
  addExpenseCategory,
  generateId,
}: ExpensesColumnProps) {
  const [view, setView] = useState<IncomeExpenseView>('grouped')
  const [displayPrefs, setDisplayPrefs] = useState<ExpenseDisplayPrefs>(readDisplayPrefs)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [bulkGroupsOpen, setBulkGroupsOpen] = useState(true)
  const [bulkOpenSignal, setBulkOpenSignal] = useState({ id: 0, open: true })

  useEffect(() => {
    queueMicrotask(() => setDisplayPrefs(readDisplayPrefs()))
  }, [])

  const visibleCreditors = useMemo(() => creditors.filter(visibleCreditor), [creditors])

  const groups = useMemo(() => {
    const storedGroups = expenseCategories.map(category => categoryKey(category))
    const dynamicGroups = visibleCreditors
      .map(creditor => categoryKey(String(creditor.category)))
      .filter(key => !BASE_GROUPS.some(group => group.id === key))

    return [
      ...BASE_GROUPS,
      ...Array.from(new Set([...storedGroups, ...dynamicGroups]))
        .filter(key => !BASE_GROUPS.some(group => group.id === key))
        .map(key => ({ id: key, label: categoryLabel(key) })),
    ]
  }, [expenseCategories, visibleCreditors])

  const categoryOptions = useMemo(() => groups.map(group => group.label), [groups])

  const getCategoryLabel = useCallback((creditor: Creditor) => {
    return categoryLabel(String(creditor.category))
  }, [])

  const handleAddExpense = () => {
    const now = new Date().toISOString()
    const id = generateId('creditor')
    addCreditor({
      id,
      name: 'New Expense',
      category: 'living',
      defaultAmount: 0,
      dueDay: null,
      dueDatePattern: '',
      notes: '',
      active: true,
      muted: false,
      archived: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
    })
    setEditingId(id)
  }

  const saveCreditor = (id: string, changes: Partial<Creditor>) => {
    updateCreditor(id, changes)
    setEditingId(null)
  }

  const archiveCreditor = (id: string) => {
    updateCreditor(id, { archived: true, active: false })
    setEditingId(null)
  }

  const toggleMute = (id: string) => {
    const creditor = creditors.find(item => item.id === id)
    if (!creditor) return
    updateCreditor(id, { muted: !creditor.muted })
  }

  const toggleAllGroups = () => {
    const nextOpen = !bulkGroupsOpen
    setBulkGroupsOpen(nextOpen)
    setBulkOpenSignal(signal => ({ id: signal.id + 1, open: nextOpen }))
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-4">
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-(--text-primary)">Expenses</h2>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ViewToggle
              value={view}
              onChange={setView}
              onToggleAll={toggleAllGroups}
              allCollapsed={!bulkGroupsOpen}
              collapseDisabled={view === 'list'}
            />
          </div>
          <button
            type="button"
            onClick={handleAddExpense}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-(--navy) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
          >
            <Plus className="size-3.5" />
            Add Expense
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <ExpenseListView
          creditors={visibleCreditors}
          categoryOptions={categoryOptions}
          categories={categoryOptions}
          editingId={editingId}
          displayPrefs={displayPrefs}
          getCategoryLabel={getCategoryLabel}
          onEditStart={setEditingId}
          onCancelEdit={() => setEditingId(null)}
          onSave={saveCreditor}
          onCategoryCreate={addExpenseCategory}
          onToggleMute={toggleMute}
          onArchive={archiveCreditor}
          onDelete={removeCreditor}
        />
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const items = visibleCreditors.filter(creditor => categoryKey(String(creditor.category)) === group.id)
            const isStoredCategory = expenseCategories.some(category => categoryKey(category) === group.id)
            if (items.length === 0 && !isStoredCategory) return null
            const subtotal = items
              .filter(creditor => !creditor.muted)
              .reduce((sum, creditor) => sum + creditor.defaultAmount, 0)
            const mutedCount = items.filter(creditor => creditor.muted).length
            return (
              <CategoryGroup
                key={group.id}
                title={group.label}
                count={items.length}
                total={subtotal}
                secondaryCountLabel={mutedCount > 0 ? `${mutedCount} muted` : undefined}
                bulkOpenSignal={bulkOpenSignal}
              >
                {items.map(creditor => (
                  <ExpenseRow
                    key={creditor.id}
                    creditor={creditor}
                    categoryLabel={group.label}
                    categories={categoryOptions}
                    onCategoryCreate={addExpenseCategory}
                    displayPrefs={displayPrefs}
                    isEditing={editingId === creditor.id}
                    onEditStart={() => setEditingId(creditor.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={changes => saveCreditor(creditor.id, changes)}
                    onToggleMute={() => toggleMute(creditor.id)}
                    onArchive={() => archiveCreditor(creditor.id)}
                    onDelete={() => removeCreditor(creditor.id)}
                  />
                ))}
              </CategoryGroup>
            )
          })}
          {visibleCreditors.length === 0 && (
            <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-[13px] text-(--text-tertiary)">
              No active expenses yet.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
