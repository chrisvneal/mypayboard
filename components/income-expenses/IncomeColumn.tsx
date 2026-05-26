'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { Income } from '@/lib/types'
import { CategoryGroup } from './CategoryGroup'
import { readGroupOpenState, saveGroupOpenState, type GroupOpenState } from './group-open-state'
import { IncomeEditForm } from './IncomeEditForm'
import { IncomeListView } from './IncomeListView'
import { IncomeRow } from './IncomeRow'
import { ViewToggle, type IncomeExpenseView } from './ViewToggle'

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

const INCOME_GROUP_OPEN_STATE_KEY = 'mypayboard-income-group-open-state'
const SAVED_CONFIRMATION_MS = 1200

const DRAFT_INCOME: Income = {
  id: 'draft-income',
  name: '',
  group: 'jobs',
  amount: 0,
  frequency: 'monthly',
  owner: 'shared',
  notes: '',
  active: true,
  muted: false,
  archived: false,
}

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
  const [view, setView] = useState<IncomeExpenseView>('grouped')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingIncome, setCreatingIncome] = useState(false)
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false)
  const [groupOpenState, setGroupOpenState] = useState<GroupOpenState>(() =>
    readGroupOpenState(INCOME_GROUP_OPEN_STATE_KEY)
  )
  const savedNoticeTimerRef = useRef<number | null>(null)
  const visibleIncomes = useMemo(() => incomes.filter(visibleIncome), [incomes])

  useEffect(() => {
    saveGroupOpenState(INCOME_GROUP_OPEN_STATE_KEY, groupOpenState)
  }, [groupOpenState])

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current)
    }
  }, [])

  const groups = useMemo(() => {
    const dynamicGroups = visibleIncomes
      .map(income => groupKey(income.group))
      .filter(key => !INCOME_GROUPS.some(group => group.id === key))

    return [
      ...INCOME_GROUPS,
      ...Array.from(new Set(dynamicGroups)).map(key => ({ id: key, label: groupLabel(key) })),
    ]
  }, [visibleIncomes])

  const groupOptions = useMemo(() => groups.map(group => group.label), [groups])

  const getGroupLabel = useCallback((income: Income) => {
    return groupLabel(income.group)
  }, [])

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
      notes: changes.notes ?? DRAFT_INCOME.notes,
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
    updateIncome(id, { archived: true, active: false })
    setEditingId(null)
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
        <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-(--text-primary)">Income</h2>
        <div className="mb-5 flex h-8 items-center justify-between">
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
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-(--navy) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
            >
              <Plus className="size-3.5" />
              Add Income
            </button>
          </div>
        </div>
        {creatingIncome && (
          <div className="overflow-hidden rounded-xl border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-[12px] font-semibold text-(--text-primary)">New income</p>
                <p className="text-[11px] text-(--text-tertiary)">Save it to the master income list.</p>
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
          onEditStart={setEditingId}
          onCancelEdit={() => setEditingId(null)}
          onSave={saveIncome}
          onArchive={archiveIncome}
          onDelete={removeIncome}
        />
      ) : (
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
              open={isGroupOpen(group.id)}
              onOpenChange={open => {
                setGroupOpenState(prev => ({ ...prev, [group.id]: open }))
              }}
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
      )}
    </section>
  )
}
