'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { generateId } from '@/lib/format'
import {
  categoryGroupKey,
  incomeMatchesCategory,
  sortCategoriesForDisplay,
} from '@/lib/category-definitions'
import { monthlyIncomeAmount } from '@/lib/incomes'
import type { CategoryDefinition, Income } from '@/lib/types'
import { CategoryGroup } from './CategoryGroup'
import { useUserPrefs, type GroupOpenState } from '@/lib/userPrefs'
import { IncomeEditForm } from './IncomeEditForm'
import { IncomeListView } from './IncomeListView'
import { IncomeRow } from './IncomeRow'
import { ViewToggle, type IncomeExpenseView } from './ViewToggle'

type IncomeColumnProps = {
  incomes: Income[]
  incomeCategories: CategoryDefinition[]
  addIncomeType: (type: string) => void
  addIncome: (income: Income) => void
  updateIncome: (incomeId: string, changes: Partial<Income>) => void
}

const SAVED_CONFIRMATION_MS = 1200

const DRAFT_INCOME: Income = {
  id: 'draft-income',
  name: '',
  group: 'jobs',
  amount: 0,
  frequency: 'monthly',
  owner: 'shared',
  active: true,
  muted: false,
  archived: false,
}

function visibleIncome(income: Income): boolean {
  return income.active !== false && !income.archived
}

export function IncomeColumn({
  incomes,
  incomeCategories,
  addIncomeType,
  addIncome,
  updateIncome,
}: IncomeColumnProps) {
  const { prefs, patch } = useUserPrefs()
  const view = prefs.incomeView
  const groupOpenState = prefs.incomeGroupOpenState
  const setView = useCallback(
    (next: IncomeExpenseView) => {
      document.querySelector<HTMLElement>('main')?.scrollTo({ top: 0, behavior: 'smooth' })
      patch({ incomeView: next })
    },
    [patch]
  )
  const setGroupOpenState = useCallback(
    (updater: GroupOpenState | ((prev: GroupOpenState) => GroupOpenState)) =>
      patch(prev => ({
        incomeGroupOpenState:
          typeof updater === 'function' ? updater(prev.incomeGroupOpenState) : updater,
      })),
    [patch]
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingIncome, setCreatingIncome] = useState(false)
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false)
  const savedNoticeTimerRef = useRef<number | null>(null)
  const visibleIncomes = useMemo(() => incomes.filter(visibleIncome), [incomes])

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current)
    }
  }, [])

  const groups = useMemo(
    () =>
      sortCategoriesForDisplay(incomeCategories, 'income').map(category => ({
        id: category.id,
        key: categoryGroupKey(category),
        label: category.name,
        category,
      })),
    [incomeCategories]
  )

  const groupOptions = useMemo(
    () => sortCategoriesForDisplay(incomeCategories, 'income'),
    [incomeCategories]
  )

  const getGroupLabel = useCallback(
    (income: Income) => {
      const matched = incomeCategories.find(
        category =>
          income.categoryId === category.id ||
          category.name.toLowerCase() === income.group.toLowerCase()
      )
      return matched?.name ?? income.group
    },
    [incomeCategories]
  )

  const isGroupOpen = (groupKeyValue: string) => groupOpenState[groupKeyValue] ?? true
  const allGroupsCollapsed = groups.length > 0 && groups.every(group => !isGroupOpen(group.key))

  const showSavedNotice = useCallback(() => {
    setSavedNoticeVisible(true)
    if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current)
    savedNoticeTimerRef.current = window.setTimeout(() => {
      setSavedNoticeVisible(false)
      savedNoticeTimerRef.current = null
    }, SAVED_CONFIRMATION_MS)
  }, [])

  const handleAddIncome = () => {
    setEditingId(null)
    setCreatingIncome(true)
  }

  const createIncome = (changes: Partial<Income>) => {
    const id = generateId('income')
    addIncome({
      id,
      name: changes.name?.trim() || 'New Income',
      group: changes.group ?? DRAFT_INCOME.group,
      amount: changes.amount ?? DRAFT_INCOME.amount,
      frequency: changes.frequency ?? DRAFT_INCOME.frequency,
      owner: changes.owner ?? DRAFT_INCOME.owner,
      active: true,
      muted: false,
      archived: false,
    })
    setCreatingIncome(false)
    showSavedNotice()
  }

  const saveIncome = (id: string, changes: Partial<Income>) => {
    updateIncome(id, changes)
    setEditingId(null)
  }

  const archiveIncome = (id: string) => {
    updateIncome(id, { archived: true, archivedAt: new Date().toISOString(), active: false })
    setEditingId(null)
  }

  const toggleAllGroups = () => {
    const nextOpen = allGroupsCollapsed
    if (!nextOpen) {
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
          <h2 className="text-[23px] font-bold tracking-tight text-(--text-primary)">Income</h2>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-(--text-secondary)">
            <span>{visibleIncomes.length} sources</span>
          </span>
        </div>
        <div className="mb-8 flex h-8 items-center justify-between">
          <ViewToggle
            value={view}
            onChange={setView}
            onToggleAll={toggleAllGroups}
            allCollapsed={allGroupsCollapsed}
            collapseDisabled={view === 'list'}
          />
          <div className="flex items-center gap-3">
            {savedNoticeVisible && (
              <span className="saved-master-confirmation text-[10px] font-medium tracking-wide">
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleAddIncome}
              aria-expanded={creatingIncome}
              className="btn-navy inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold shadow-(--shadow-sm)"
            >
              <Plus className="size-3.5" />
              Add Income
            </button>
          </div>
        </div>
        {creatingIncome && (
          <div className="overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-base font-semibold leading-snug text-(--text-primary)">New income</p>
                <p className="mt-2 text-xs leading-relaxed text-(--text-tertiary)">Save it to the master income list.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingIncome(false)}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)"
                aria-label="Close new income form"
              >
                <X className="size-4" />
              </button>
            </div>
            <IncomeEditForm
              income={DRAFT_INCOME}
              groupOptions={groupOptions}
              onGroupCreate={addIncomeType}
              mode="create"
              onSave={createIncome}
              onCancel={() => setCreatingIncome(false)}
            />
          </div>
        )}
      </div>

      {view === 'list' ? (
        <IncomeListView
          incomes={visibleIncomes}
          groupOptions={groupOptions}
          editingId={editingId}
          getGroupLabel={getGroupLabel}
          onGroupCreate={addIncomeType}
          onEditStart={setEditingId}
          onCancelEdit={() => setEditingId(null)}
          onSave={saveIncome}
          onArchive={archiveIncome}
        />
      ) : (
      <div className="space-y-4">
        {groups.map(group => {
          const items = visibleIncomes.filter(income =>
            incomeMatchesCategory(income, group.category, incomeCategories)
          )
          if (items.length === 0) return null
          const subtotal = items
            .filter(income => !income.muted)
            .reduce((sum, income) => sum + monthlyIncomeAmount(income), 0)
          return (
            <CategoryGroup
              key={group.id}
              title={group.label}
              count={items.length}
              total={subtotal}
              totalTone="green"
              countLabel="sources"
              open={isGroupOpen(group.key)}
              onOpenChange={open => {
                setGroupOpenState(prev => ({ ...prev, [group.key]: open }))
              }}
            >
              {items.map((income, index) => (
                <IncomeRow
                  key={income.id}
                  income={income}
                  groupLabel={group.label}
                  groupOptions={groupOptions}
                  onGroupCreate={addIncomeType}
                  isEditing={editingId === income.id}
                  onEditStart={() => setEditingId(income.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={changes => saveIncome(income.id, changes)}
                  onArchive={() => archiveIncome(income.id)}
                  isLast={index === items.length - 1}
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
      )}
    </section>
  )
}
