'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
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

type SortableCategoryRowProps = {
  category: CategoryDefinition
  selected: boolean
  pendingDelete: boolean
  editing: boolean
  draftName: string
  onToggleSelect: () => void
  onStartEdit: () => void
  onDraftChange: (value: string) => void
  onConfirmEdit: () => void
  onCancelEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
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

function SortableCategoryRow({
  category,
  selected,
  pendingDelete,
  editing,
  draftName,
  onToggleSelect,
  onStartEdit,
  onDraftChange,
  onConfirmEdit,
  onCancelEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: SortableCategoryRowProps) {
  const fallback = isFallbackCategory(category)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: fallback,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 border-b border-[--module-divider-color] px-3 py-2.5 last:border-b-0',
        isDragging && 'opacity-50'
      )}
    >
      {!fallback ? (
        <button
          type="button"
          className={cn(
            'inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition duration-200 ease-out group-hover:opacity-100 active:cursor-grabbing',
            isDragging && 'opacity-100'
          )}
          aria-label={`Reorder ${category.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" strokeWidth={1.75} />
        </button>
      ) : (
        <span className="inline-flex size-7 shrink-0" aria-hidden />
      )}

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

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [draftRow, setDraftRow] = useState<DraftRow | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = reorderableCategories.findIndex(item => item.id === active.id)
    const newIndex = reorderableCategories.findIndex(item => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const nextOrder = arrayMove(
      reorderableCategories.map(item => item.id),
      oldIndex,
      newIndex
    )
    onReorder(nextOrder)
  }

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

    return (
      <SortableCategoryRow
        key={category.id}
        category={category}
        selected={selectedIds.includes(category.id)}
        pendingDelete={pendingDeleteId === category.id}
        editing={editingId === category.id}
        draftName={editDraft}
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={reorderableCategories.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
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
                <span>
                  {selectedIds.length} selected
                </span>
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
        </SortableContext>
      </DndContext>
    </div>
  )
}
