'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  EXPENSE_CATEGORY_GROUPS,
  categoryKey,
  categoryLabel,
  isVisibleCreditor,
  plannedMonthlyPayment,
} from '@/lib/creditors'
import { generateId } from '@/lib/format'
import type { Creditor } from '@/lib/types'
import { CategoryGroup } from './CategoryGroup'
import { readDisplayPrefs, type ExpenseDisplayPrefs } from './DisplayToggle'
import { ExpenseEditForm } from './ExpenseEditForm'
import { ExpenseListView } from './ExpenseListView'
import { ExpenseRow } from './ExpenseRow'
import { readGroupOpenState, saveGroupOpenState, type GroupOpenState } from './group-open-state'
import { readViewState, saveViewState } from './view-state'
import { ViewToggle, type IncomeExpenseView } from './ViewToggle'

type ExpensesColumnProps = {
  creditors: Creditor[]
  expenseCategories: string[]
  addCreditor: (creditor: Creditor) => void
  updateCreditor: (creditorId: string, changes: Partial<Creditor>) => void
  removeCreditor: (creditorId: string) => void
  addExpenseCategory: (category: string) => void
}

const EXPENSE_GROUP_OPEN_STATE_KEY = 'mypayboard-expense-group-open-state'
const EXPENSE_VIEW_STATE_KEY = 'mypayboard-expense-view-state'
const SAVED_CONFIRMATION_MS = 1200

const DRAFT_EXPENSE: Creditor = {
  id: 'draft-expense',
  name: '',
  category: 'Miscellaneous',
  defaultAmount: 0,
  dueDay: null,
  dueDatePattern: '',
  notes: '',
  active: true,
  muted: false,
  archived: false,
  tags: [],
  createdAt: '',
  updatedAt: '',
}

export function ExpensesColumn({
  creditors,
  expenseCategories,
  addCreditor,
  updateCreditor,
  removeCreditor,
  addExpenseCategory,
}: ExpensesColumnProps) {
  const [view, setView] = useState<IncomeExpenseView>(() => readViewState(EXPENSE_VIEW_STATE_KEY))
  const [displayPrefs, setDisplayPrefs] = useState<ExpenseDisplayPrefs>(readDisplayPrefs)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingExpense, setCreatingExpense] = useState(false)
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false)
  const [groupOpenState, setGroupOpenState] = useState<GroupOpenState>(() =>
    readGroupOpenState(EXPENSE_GROUP_OPEN_STATE_KEY)
  )
  const savedNoticeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    queueMicrotask(() => setDisplayPrefs(readDisplayPrefs()))
  }, [])

  useEffect(() => {
    saveGroupOpenState(EXPENSE_GROUP_OPEN_STATE_KEY, groupOpenState)
  }, [groupOpenState])

  useEffect(() => {
    saveViewState(EXPENSE_VIEW_STATE_KEY, view)
  }, [view])

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current)
    }
  }, [])

  const visibleCreditors = useMemo(() => creditors.filter(isVisibleCreditor), [creditors])
  const mutedCreditorsCount = useMemo(
    () => visibleCreditors.filter(creditor => creditor.muted).length,
    [visibleCreditors]
  )

  const groups = useMemo(() => {
    const storedGroups = expenseCategories.map(category => categoryKey(category))
    const dynamicGroups = visibleCreditors
      .map(creditor => categoryKey(String(creditor.category)))
      .filter(key => !EXPENSE_CATEGORY_GROUPS.some(group => group.id === key))

    return [
      ...EXPENSE_CATEGORY_GROUPS,
      ...Array.from(new Set([...storedGroups, ...dynamicGroups]))
        .filter(key => !EXPENSE_CATEGORY_GROUPS.some(group => group.id === key))
        .map(key => ({
          id: key,
          label: categoryLabel(key, { customCategories: expenseCategories }),
        })),
    ]
  }, [expenseCategories, visibleCreditors])

  const categoryOptions = useMemo(() => groups.map(group => group.label), [groups])

  const getCategoryLabel = useCallback(
    (creditor: Creditor) =>
      categoryLabel(String(creditor.category), { customCategories: expenseCategories }),
    [expenseCategories]
  )

  const isGroupOpen = (groupId: string) => groupOpenState[groupId] ?? true
  const allGroupsCollapsed = groups.length > 0 && groups.every(group => !isGroupOpen(group.id))

  const showSavedNotice = useCallback(() => {
    setSavedNoticeVisible(true)
    if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current)
    savedNoticeTimerRef.current = window.setTimeout(() => {
      setSavedNoticeVisible(false)
      savedNoticeTimerRef.current = null
    }, SAVED_CONFIRMATION_MS)
  }, [])

  const handleAddExpense = () => {
    setEditingId(null)
    setCreatingExpense(true)
  }

  const createCreditor = (changes: Partial<Creditor>) => {
    const now = new Date().toISOString()
    const id = generateId('creditor')
    addCreditor({
      id,
      name: changes.name?.trim() || 'New Expense',
      category: changes.category ?? DRAFT_EXPENSE.category,
      defaultAmount: changes.defaultAmount ?? DRAFT_EXPENSE.defaultAmount,
      dueDay: changes.dueDay ?? DRAFT_EXPENSE.dueDay,
      dueDatePattern: changes.dueDatePattern ?? DRAFT_EXPENSE.dueDatePattern,
      notes: changes.notes ?? DRAFT_EXPENSE.notes,
      active: true,
      muted: false,
      archived: false,
      owner: changes.owner,
      accountLastFour: changes.accountLastFour,
      url: changes.url,
      website: changes.website,
      trackDebt: changes.trackDebt,
      debtDetail: changes.debtDetail,
      tags: changes.tags ?? [],
      createdAt: now,
      updatedAt: now,
    })
    setCreatingExpense(false)
    showSavedNotice()
  }

  const saveCreditor = (id: string, changes: Partial<Creditor>) => {
    updateCreditor(id, changes)
    setEditingId(null)
  }

  const archiveCreditor = (id: string) => {
    updateCreditor(id, { archived: true, archivedAt: new Date().toISOString(), active: false })
    setEditingId(null)
  }

  const toggleMute = (id: string) => {
    const creditor = creditors.find(item => item.id === id)
    if (!creditor) return
    updateCreditor(id, { muted: !creditor.muted })
  }

  const toggleAllGroups = () => {
    const nextOpen = allGroupsCollapsed
    setGroupOpenState(prev => ({
      ...prev,
      ...Object.fromEntries(groups.map(group => [group.id, nextOpen])),
    }))
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className="text-[23px] font-bold tracking-tight text-(--text-primary)">Expenses</h2>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--text-secondary)">
            <span>{visibleCreditors.length} bills</span>
            {mutedCreditorsCount > 0 && (
              <>
                <span className="size-1 rounded-full bg-(--text-secondary)" aria-hidden />
                <span>{mutedCreditorsCount} muted</span>
              </>
            )}
          </span>
        </div>
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ViewToggle
              value={view}
              onChange={setView}
              onToggleAll={toggleAllGroups}
              allCollapsed={allGroupsCollapsed}
              collapseDisabled={view === 'list'}
            />
          </div>
          <div className="flex items-center gap-3">
            {savedNoticeVisible && (
              <span className="saved-master-confirmation text-[10px] font-medium tracking-wide">
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleAddExpense}
              aria-expanded={creatingExpense}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-(--navy) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
            >
              <Plus className="size-3.5" />
              Add Expense
            </button>
          </div>
        </div>
        {creatingExpense && (
          <div className="overflow-hidden rounded-xl border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-base font-semibold leading-snug text-(--text-primary)">New expense</p>
                <p className="mt-2 text-xs leading-relaxed text-(--text-tertiary)">Save it to the master expense list.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingExpense(false)}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)"
                aria-label="Close new expense form"
              >
                <X className="size-4" />
              </button>
            </div>
            <ExpenseEditForm
              creditor={DRAFT_EXPENSE}
              categories={categoryOptions}
              mode="create"
              onCategoryCreate={addExpenseCategory}
              onSave={createCreditor}
              onCancel={() => setCreatingExpense(false)}
            />
          </div>
        )}
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
              .reduce((sum, creditor) => sum + plannedMonthlyPayment(creditor), 0)
            const mutedCount = items.filter(creditor => creditor.muted).length
            return (
              <CategoryGroup
                key={group.id}
                title={group.label}
                count={items.length}
                total={subtotal}
                secondaryCountLabel={mutedCount > 0 ? `${mutedCount} muted` : undefined}
                open={isGroupOpen(group.id)}
                onOpenChange={open => {
                  setGroupOpenState(prev => ({ ...prev, [group.id]: open }))
                }}
              >
                {items.map((creditor, index) => (
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
                    isLast={index === items.length - 1}
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
