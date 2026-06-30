'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { scrollInlineCreateFormOnNextFrame } from '@/lib/pay-date-card-form-scroll'
import {
  categoryGroupKey,
  creditorMatchesCategory,
  sortCategoriesForDisplay,
  findCategoryByName,
  getFallbackCategory,
} from '@/lib/category-definitions'
import { generateId } from '@/lib/format'
import { isVisibleCreditor, plannedMonthlyPayment } from '@/lib/creditors'
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CategoryGroup } from './CategoryGroup'
import { ExpenseEditForm } from './ExpenseEditForm'
import { ExpenseListView } from './ExpenseListView'
import { ExpenseRow } from './ExpenseRow'
import { MultiBillForm } from './MultiBillForm'
import { useUserPrefs, type GroupOpenState } from '@/lib/userPrefs'
import { ViewToggle, type IncomeExpenseView } from './ViewToggle'

type ExpensesColumnProps = {
  creditors: Creditor[]
  expenseCategories: CategoryDefinition[]
  addCreditor: (creditor: Creditor) => void
  updateCreditor: (creditorId: string, changes: Partial<Creditor>) => void
  addExpenseCategory: (category: string) => void
}

const SAVED_CONFIRMATION_MS = 1200
const NEW_BILL_FORM_ID = 'new-bill-form'
const MULTI_BILL_FORM_ID = 'multi-bill-form'

const DRAFT_EXPENSE: Creditor = {
  id: 'draft-expense',
  name: '',
  category: 'Other',
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
  addExpenseCategory,
}: ExpensesColumnProps) {
  const { prefs, patch } = useUserPrefs()
  const view = prefs.expenseView
  const groupOpenState = prefs.expenseGroupOpenState
  const setView = useCallback(
    (next: IncomeExpenseView) => {
      if (window.innerWidth >= 768) {
        document.querySelector<HTMLElement>('main')?.scrollTo({ top: 0, behavior: 'smooth' })
      }
      patch({ expenseView: next })
    },
    [patch]
  )
  const setGroupOpenState = useCallback(
    (updater: GroupOpenState | ((prev: GroupOpenState) => GroupOpenState)) =>
      patch(prev => ({
        expenseGroupOpenState:
          typeof updater === 'function' ? updater(prev.expenseGroupOpenState) : updater,
      })),
    [patch]
  )
  const displayPrefs = prefs.expenseDisplayPrefs
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingExpense, setCreatingExpense] = useState(false)
  const [multiBillMode, setMultiBillMode] = useState(false)
  const [multiBillValidCount, setMultiBillValidCount] = useState(0)
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false)
  const savedNoticeTimerRef = useRef<number | null>(null)
  const createFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!creatingExpense) return
    scrollInlineCreateFormOnNextFrame(() => createFormRef.current)
  }, [creatingExpense])

  const visibleCreditors = useMemo(() => creditors.filter(isVisibleCreditor), [creditors])
  const mutedCreditorsCount = useMemo(
    () => visibleCreditors.filter(creditor => creditor.muted).length,
    [visibleCreditors]
  )

  const groups = useMemo(
    () =>
      sortCategoriesForDisplay(expenseCategories, 'expense').map(category => ({
        id: category.id,
        key: categoryGroupKey(category),
        label: category.name,
        category,
      })),
    [expenseCategories]
  )

  const categoryOptions = useMemo(
    () => sortCategoriesForDisplay(expenseCategories, 'expense'),
    [expenseCategories]
  )

  const categoryNameOptions = useMemo(
    () => categoryOptions.map(category => category.name),
    [categoryOptions]
  )

  const getCategoryLabel = useCallback(
    (creditor: Creditor) => {
      const matched = expenseCategories.find(
        category =>
          creditor.categoryId === category.id ||
          category.name.toLowerCase() === String(creditor.category).toLowerCase()
      )
      if (matched) return matched.name
      
      const categoryByLegacyName = findCategoryByName(expenseCategories, 'expense', String(creditor.category))
      if (categoryByLegacyName) return categoryByLegacyName.name
      
      return getFallbackCategory(expenseCategories, 'expense').name
    },
    [expenseCategories]
  )

  const isGroupOpen = (groupId: string) => groupOpenState[groupId] ?? true
  const allGroupsCollapsed = groups.length > 0 && groups.every(group => !isGroupOpen(group.key))

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
    setMultiBillMode(false)
    setCreatingExpense(true)
  }

  const closeCreateForm = () => {
    setCreatingExpense(false)
    setMultiBillMode(false)
    setMultiBillValidCount(0)
  }

  const buildCreditorFromChanges = (changes: Partial<Creditor>): Creditor => ({
    id: generateId('creditor'),
    name: changes.name?.trim() || 'New Bill',
    category: changes.category ?? DRAFT_EXPENSE.category,
    categoryId: changes.categoryId,
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
    icon: changes.icon,
    trackDebt: changes.trackDebt,
    debtDetail: changes.debtDetail,
    tags: changes.tags ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const createCreditor = (changes: Partial<Creditor>) => {
    addCreditor(buildCreditorFromChanges(changes))
    closeCreateForm()
    showSavedNotice()
  }

  const createCreditorsBatch = (rowsChanges: Partial<Creditor>[]) => {
    rowsChanges.forEach(changes => addCreditor(buildCreditorFromChanges(changes)))
    closeCreateForm()
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
    if (!nextOpen && window.innerWidth >= 768) {
      document.querySelector<HTMLElement>('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setGroupOpenState(prev => ({
      ...prev,
      ...Object.fromEntries(groups.map(group => [group.key, nextOpen])),
    }))
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className="text-[23px] font-bold tracking-tight text-(--text-primary)">Bills</h2>
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
              className="btn-navy inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold shadow-(--shadow-sm)"
            >
              <Plus className="size-3.5" />
              Add Bill
            </button>
          </div>
        </div>
        {creatingExpense && (
          <div ref={createFormRef} className="inline-create-form-host">
            <div className="overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
              <div className="flex items-start justify-between gap-3 border-b border-[--module-divider-color] px-5 py-3">
                <div>
                  <p className="text-base font-semibold leading-snug text-(--text-primary)">
                    {multiBillMode ? 'Add multiple bills' : 'New bill'}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs leading-relaxed text-(--text-tertiary)">
                    <span>{multiBillMode ? 'Add several bills to the list.' : 'Add a single bill to the list.'}</span>
                    {!multiBillMode && (
                      <>
                        <span className="size-1 rounded-full bg-(--text-tertiary)" aria-hidden />
                        <button
                          type="button"
                          onClick={() => setMultiBillMode(true)}
                          className="cursor-pointer font-semibold text-(--navy) underline decoration-(--navy)/40 underline-offset-2 transition duration-200 ease-out hover:text-(--navy-dark) hover:decoration-(--navy-dark)"
                        >
                          Add multiple
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="inline-flex size-11 xl:size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)"
                  aria-label="Close new bill form"
                >
                  <X className="size-4" />
                </button>
              </div>
              {multiBillMode ? (
                <MultiBillForm
                  categories={categoryOptions}
                  defaultCategoryName={DRAFT_EXPENSE.category}
                  formId={MULTI_BILL_FORM_ID}
                  onSave={createCreditorsBatch}
                  onValidCountChange={setMultiBillValidCount}
                />
              ) : (
                <ExpenseEditForm
                  creditor={DRAFT_EXPENSE}
                  categories={categoryOptions}
                  mode="create"
                  shellFooter
                  embeddedInShell
                  formId={NEW_BILL_FORM_ID}
                  onCategoryCreate={addExpenseCategory}
                  onSave={createCreditor}
                  onCancel={closeCreateForm}
                />
              )}
              <div className="inline-create-form__footer flex flex-wrap justify-end gap-2 border-t border-[--module-divider-color] px-5 py-3">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) transition duration-200 ease-out hover:bg-(--bg-tertiary)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form={multiBillMode ? MULTI_BILL_FORM_ID : NEW_BILL_FORM_ID}
                  disabled={multiBillMode && multiBillValidCount === 0}
                  className={cn(
                    'inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--green) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--green-dark)',
                    multiBillMode && multiBillValidCount === 0 && 'cursor-not-allowed opacity-50 hover:bg-(--green)'
                  )}
                >
                  {multiBillMode
                    ? `Save ${multiBillValidCount} Bill${multiBillValidCount === 1 ? '' : 's'}`
                    : 'Save Bill'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {view === 'list' ? (
        <ExpenseListView
          creditors={visibleCreditors}
          categoryOptions={categoryNameOptions}
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
        />
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const items = visibleCreditors.filter(creditor =>
              creditorMatchesCategory(creditor, group.category, expenseCategories)
            )
            if (items.length === 0) return null
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
                open={isGroupOpen(group.key)}
                onOpenChange={open => {
                  setGroupOpenState(prev => ({ ...prev, [group.key]: open }))
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
                    isLast={index === items.length - 1}
                    followsExpandedEdit={index > 0 && editingId === items[index - 1]?.id}
                  />
                ))}
              </CategoryGroup>
            )
          })}
          {visibleCreditors.length === 0 && (
            <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-[13px] text-(--text-tertiary)">
              No active bills yet.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
