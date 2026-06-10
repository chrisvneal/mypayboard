'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { CategoryDefinition, Creditor, IncomeSource } from '@/lib/types'
import type { CategoryScope } from '@/lib/category-definitions'
import {
  countCreditorsInCategory,
  countIncomesInCategory,
  fallbackCategoryHint,
  isFallbackCategory,
  sortCategoriesForDisplay,
} from '@/lib/category-definitions'
import { cn } from '@/lib/utils'

type OrganizeCategorySectionProps = {
  scope: CategoryScope
  title: string
  description: string
  icon: React.ReactNode
  categories: CategoryDefinition[]
  creditors: Creditor[]
  incomes: IncomeSource[]
  onAdd: (name: string) => void
  onRename: (categoryId: string, name: string) => void
  onDelete: (categoryIds: string[]) => void
  onReorder: (orderedIds: string[]) => void
}

type DraftRow = {
  id: string
  name: string
}

function countItemsInCategory(
  category: CategoryDefinition,
  scope: CategoryScope,
  creditors: Creditor[],
  incomes: IncomeSource[],
  expenseCategories: CategoryDefinition[],
  incomeCategories: CategoryDefinition[]
): number {
  if (scope === 'expense') {
    return countCreditorsInCategory(creditors, category, expenseCategories)
  }
  return countIncomesInCategory(incomes, category, incomeCategories)
}

function CategoryNameWithHint({
  name,
  fallbackHint,
}: {
  name: string
  fallbackHint?: string
}) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      <span className="truncate text-[13px] font-medium text-(--text-primary)">{name}</span>
      {fallbackHint && (
        <span className="text-[11px] font-normal italic text-(--text-tertiary)">{fallbackHint}</span>
      )}
    </span>
  )
}

type CategoryRowProps = {
  category: CategoryDefinition
  selected: boolean
  pendingDelete: boolean
  editing: boolean
  draftName: string
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleSelect: () => void
  onStartEdit: () => void
  onDraftChange: (value: string) => void
  onConfirmEdit: () => void
  onCancelEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

const reorderButtonClass =
  'inline-flex size-3.5 cursor-pointer items-center justify-center rounded text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--navy) disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-(--text-tertiary)'

function ReorderControls({
  name,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  name: string
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="inline-flex size-7 shrink-0 flex-col items-center justify-center">
      <button
        type="button"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        aria-label={`Move ${name} up`}
        className={reorderButtonClass}
      >
        <ChevronUp className="size-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        aria-label={`Move ${name} down`}
        className={reorderButtonClass}
      >
        <ChevronDown className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

function StaticCategoryRow({
  category,
  fallbackHint,
}: {
  category: CategoryDefinition
  fallbackHint?: string
}) {
  return (
    <div className="group flex items-center gap-2 border-b border-[--module-divider-color] px-3 py-2.5 last:border-b-0">
      <span className="inline-flex size-7 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <CategoryNameWithHint name={category.name} fallbackHint={fallbackHint} />
      </div>
    </div>
  )
}

function CategoryRow({
  category,
  selected,
  pendingDelete,
  editing,
  draftName,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleSelect,
  onStartEdit,
  onDraftChange,
  onConfirmEdit,
  onCancelEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: CategoryRowProps) {
  const fallback = isFallbackCategory(category)

  return (
    <div className="group flex items-center gap-2 border-b border-[--module-divider-color] px-3 py-2.5 last:border-b-0">
      <ReorderControls
        name={category.name}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={e => onDraftChange(e.target.value)}
            onBlur={onConfirmEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onConfirmEdit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                onCancelEdit()
              }
            }}
            className="h-8 w-full rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-2.5 text-[13px] text-(--text-primary) outline-none transition duration-200 ease-out focus:border-(--navy)"
          />
        ) : (
          <button
            type="button"
            disabled={fallback}
            onClick={() => {
              if (!fallback) onStartEdit()
            }}
            className={cn(
              'min-w-0 text-left',
              !fallback && 'cursor-text hover:text-(--navy)'
            )}
          >
            <CategoryNameWithHint name={category.name} />
          </button>
        )}
      </div>

      {!fallback && (
        <label
          className={cn(
            'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition duration-200 ease-out',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="size-3.5 cursor-pointer accent-(--navy)"
            aria-label={`Select ${category.name}`}
          />
        </label>
      )}

      {!fallback && (
        <div className="flex shrink-0 items-center">
          {pendingDelete ? (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-(--text-secondary)">Delete?</span>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="cursor-pointer font-medium text-(--danger-muted) transition duration-200 ease-out hover:text-(--danger)"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="cursor-pointer text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-secondary)"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestDelete}
              aria-label={`Delete ${category.name}`}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition duration-200 ease-out group-hover:opacity-100 hover:text-(--danger-muted)"
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyDraftRow({
  draft,
  onDraftChange,
  onConfirm,
  onCancel,
}: {
  draft: string
  onDraftChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[--module-divider-color] px-3 py-2.5">
      <span className="inline-flex size-7 shrink-0" aria-hidden />
      <input
        autoFocus
        value={draft}
        placeholder="Group name"
        onChange={e => onDraftChange(e.target.value)}
        onBlur={onConfirm}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onConfirm()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        className="h-8 min-w-0 flex-1 rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-2.5 text-[13px] text-(--text-primary) outline-none transition duration-200 ease-out focus:border-(--navy)"
      />
    </div>
  )
}

export function OrganizeCategorySection({
  scope,
  title,
  description,
  icon,
  categories,
  creditors,
  incomes,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}: OrganizeCategorySectionProps) {
  const expenseCategories = scope === 'expense' ? categories : []
  const incomeCategories = scope === 'income' ? categories : []
  const sortedCategories = useMemo(
    () => sortCategoriesForDisplay(categories, scope),
    [categories, scope]
  )
  const reorderableCategories = useMemo(
    () => sortedCategories.filter(item => !isFallbackCategory(item)),
    [sortedCategories]
  )
  const reorderableIds = useMemo(
    () => reorderableCategories.map(item => item.id),
    [reorderableCategories]
  )

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [draftRow, setDraftRow] = useState<DraftRow | null>(null)

  const resolvedExpenseCategories = expenseCategories.length > 0 ? expenseCategories : categories
  const resolvedIncomeCategories = incomeCategories.length > 0 ? incomeCategories : categories

  const getItemCount = (category: CategoryDefinition) =>
    countItemsInCategory(
      category,
      scope,
      creditors,
      incomes,
      resolvedExpenseCategories,
      resolvedIncomeCategories
    )

  const populated = useMemo(
    () => sortedCategories.filter(category => getItemCount(category) > 0),
    [sortedCategories, scope, creditors, incomes, resolvedExpenseCategories, resolvedIncomeCategories]
  )

  const empty = useMemo(
    () => sortedCategories.filter(category => getItemCount(category) === 0),
    [sortedCategories, scope, creditors, incomes, resolvedExpenseCategories, resolvedIncomeCategories]
  )

  const startEdit = (category: CategoryDefinition) => {
    setEditingId(category.id)
    setEditDraft(category.name)
    setPendingDeleteId(null)
  }

  const confirmEdit = (categoryId: string) => {
    const trimmed = editDraft.trim()
    if (trimmed) onRename(categoryId, trimmed)
    setEditingId(null)
    setEditDraft('')
  }

  const cancelEdit = (originalName: string) => {
    setEditingId(null)
    setEditDraft(originalName)
  }

  const toggleSelected = (categoryId: string) => {
    setSelectedIds(current =>
      current.includes(categoryId)
        ? current.filter(id => id !== categoryId)
        : [...current, categoryId]
    )
  }

  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) return
    onDelete(selectedIds)
    setSelectedIds([])
    setPendingDeleteId(null)
  }

  const startDraftRow = () => {
    setDraftRow({ id: `draft-${Date.now()}`, name: '' })
    setEditingId(null)
    setPendingDeleteId(null)
  }

  const confirmDraftRow = () => {
    const trimmed = draftRow?.name.trim() ?? ''
    if (trimmed) onAdd(trimmed)
    setDraftRow(null)
  }

  const cancelDraftRow = () => {
    setDraftRow(null)
  }

  const moveCategory = (categoryId: string, direction: 'up' | 'down') => {
    const index = reorderableIds.indexOf(categoryId)
    if (index === -1) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= reorderableIds.length) return
    const next = [...reorderableIds]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    onReorder(next)
  }

  const renderCategoryRow = (category: CategoryDefinition) => {
    if (isFallbackCategory(category)) {
      return (
        <StaticCategoryRow
          key={category.id}
          category={category}
          fallbackHint={fallbackCategoryHint(scope)}
        />
      )
    }

    const reorderIndex = reorderableIds.indexOf(category.id)

    return (
      <CategoryRow
        key={category.id}
        category={category}
        selected={selectedIds.includes(category.id)}
        pendingDelete={pendingDeleteId === category.id}
        editing={editingId === category.id}
        draftName={editDraft}
        canMoveUp={reorderIndex > 0}
        canMoveDown={reorderIndex >= 0 && reorderIndex < reorderableIds.length - 1}
        onMoveUp={() => moveCategory(category.id, 'up')}
        onMoveDown={() => moveCategory(category.id, 'down')}
        onToggleSelect={() => toggleSelected(category.id)}
        onStartEdit={() => startEdit(category)}
        onDraftChange={setEditDraft}
        onConfirmEdit={() => confirmEdit(category.id)}
        onCancelEdit={() => cancelEdit(category.name)}
        onRequestDelete={() => setPendingDeleteId(category.id)}
        onConfirmDelete={() => {
          onDelete([category.id])
          setPendingDeleteId(null)
          setSelectedIds(current => current.filter(id => id !== category.id))
        }}
        onCancelDelete={() => setPendingDeleteId(null)}
      />
    )
  }

  return (
    <div className="grid gap-7 lg:row-span-2 lg:grid-rows-subgrid lg:gap-y-7">
      <section className="w-full self-start overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
        <div className="border-b border-[--module-divider-color] px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-(--bg-secondary) text-(--navy)">
              {icon}
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-(--text-primary)">{title}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-(--text-tertiary)">{description}</p>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 border-b border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2 text-[12px] text-(--text-secondary)">
            <span>{selectedIds.length} selected</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={confirmBulkDelete}
              className="cursor-pointer font-medium text-(--danger-muted) transition duration-200 ease-out hover:text-(--danger)"
            >
              Delete selected
            </button>
          </div>
        )}

        {populated.map(renderCategoryRow)}

        {draftRow && (
          <EmptyDraftRow
            draft={draftRow.name}
            onDraftChange={name => setDraftRow(current => (current ? { ...current, name } : current))}
            onConfirm={confirmDraftRow}
            onCancel={cancelDraftRow}
          />
        )}

        <button
          type="button"
          onClick={startDraftRow}
          className="add-bill-row group flex w-full items-center gap-2 px-3 py-2.5 text-[13px] font-normal text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-secondary)"
        >
          <Plus
            className="size-3.5 shrink-0 opacity-70 transition duration-200 ease-out group-hover:opacity-100"
            aria-hidden
          />
          <span>Add Group</span>
        </button>
      </section>

      {empty.length > 0 && (
        <section className="w-full self-start overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
          {populated.length > 0 && (
            <div className="border-b border-[--module-divider-color] px-4 py-2 text-[11px] font-medium tracking-wide text-(--text-tertiary) uppercase">
              {scope === 'expense' ? 'Empty Bill Groups' : 'Empty Income Groups'}
            </div>
          )}
          {empty.map(renderCategoryRow)}
        </section>
      )}
    </div>
  )
}
