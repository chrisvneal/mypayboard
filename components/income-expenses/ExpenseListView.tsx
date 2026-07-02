'use client'

import { useMemo, useState } from 'react'
import { X, ArrowDown, ArrowUp } from 'lucide-react'
import {
  matchesMasterListStatusFilter,
  type MasterListStatusFilter,
} from '@/lib/creditors'
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { ExpenseDisplayPrefs } from './DisplayToggle'
import { ExpenseRow, expenseListGridCols } from './ExpenseRow'

type ExpenseListViewProps = {
  creditors: Creditor[]
  categoryOptions: string[]
  categories: CategoryDefinition[]
  editingId: string | null
  displayPrefs: ExpenseDisplayPrefs
  getCategoryLabel: (creditor: Creditor) => string
  onEditStart: (id: string) => void
  onCancelEdit: () => void
  onSave: (id: string, changes: Partial<Creditor>) => void
  onCategoryCreate: (category: string) => void
  onToggleMute: (id: string) => void
  onArchive: (id: string) => void
}

const ALL_CATEGORIES = 'all'
type ExpenseSortKey = 'name' | 'category' | 'amount' | 'due' | 'status' | null
type ExpenseSortDirection = 'asc' | 'desc'
type ExpenseSortState = {
  key: ExpenseSortKey
  direction: ExpenseSortDirection
} | null

function matchesText(value: string, query: string): boolean {
  return !query || value.toLowerCase().includes(query)
}

function dueSortValue(creditor: Creditor): number {
  if (typeof creditor.dueDay === 'number') return creditor.dueDay
  const match = /\/(\d{1,2})$/.exec(creditor.dueDatePattern ?? '')
  if (match) return Number(match[1])
  if (creditor.dueDay === 'asap' || creditor.dueDatePattern?.toUpperCase() === 'ASAP') return 0
  return 99
}

function sortValue(creditor: Creditor, key: ExpenseSortKey): string | number {
  switch (key) {
    case 'name':
      return creditor.name.toLowerCase()
    case 'category':
      return creditor.category.toLowerCase()
    case 'amount':
      return creditor.defaultAmount
    case 'due':
      return dueSortValue(creditor)
    case 'status':
      return creditor.muted ? 1 : 0
    default:
      return creditor.name.toLowerCase()
  }
}

function compareValues(
  a: string | number,
  z: string | number,
  direction: ExpenseSortDirection
): number {
  const result =
    typeof a === 'string' && typeof z === 'string'
      ? a.localeCompare(z)
      : Number(a) - Number(z)

  return direction === 'asc' ? result : -result
}

export function ExpenseListView({
  creditors,
  categoryOptions,
  categories,
  editingId,
  displayPrefs,
  getCategoryLabel,
  onEditStart,
  onCancelEdit,
  onSave,
  onCategoryCreate,
  onToggleMute,
  onArchive,
}: ExpenseListViewProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [status, setStatus] = useState<MasterListStatusFilter>('all')
  const [sort, setSort] = useState<ExpenseSortState>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = creditors.filter(creditor => {
      if (!matchesText(creditor.name, q)) return false
      if (category !== ALL_CATEGORIES && getCategoryLabel(creditor) !== category) return false
      if (!matchesMasterListStatusFilter(creditor, status)) return false
      return true
    })

    if (!sort)
      return filtered.sort((a, z) => a.name.localeCompare(z.name))

    return filtered
      .map((creditor, index) => ({ creditor, index }))
      .sort((a, z) => {
        const result = compareValues(
          sortValue(a.creditor, sort.key),
          sortValue(z.creditor, sort.key),
          sort.direction
        )
        return result || a.index - z.index
      })
      .map(({ creditor }) => creditor)
  }, [category, creditors, getCategoryLabel, query, sort, status])

  function toggleSort(key: ExpenseSortKey) {
    setSort(current => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const controlClass =
    'field-control min-h-9 border border-[--module-divider-color] px-3 py-2 text-[12px] leading-tight text-(--text-secondary) outline-none focus:border-(--navy)'

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_120px]">
        <div className="relative min-w-0">
          <input
            className={`${controlClass} w-full pr-8`}
            placeholder="Search bills"
            aria-label="Search bills"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 inline-flex size-8 xl:size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-secondary)"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <select className={controlClass} aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}>
          <option value={ALL_CATEGORIES}>All Categories</option>
          {categoryOptions.map(option => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select className={controlClass} aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="muted">Muted</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-t-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
        <div className="overflow-x-auto">
        <div
          className={cn(
            'grid gap-3 border-b border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-(--text-secondary) min-w-0 md:min-w-[560px]',
            expenseListGridCols(displayPrefs.accountNumber)
          )}
        >
          <button
            type="button"
            onClick={() => toggleSort('name')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'name' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>BILL NAME</span>
            {sort?.key === 'name' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'name' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          {displayPrefs.accountNumber && <span className="hidden md:block">ACCOUNT</span>}
          <button
            type="button"
            onClick={() => toggleSort('category')}
            className={cn(
              'hidden md:inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'category' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>CATEGORY</span>
            {sort?.key === 'category' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'category' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('amount')}
            className={cn(
              'inline-flex cursor-pointer items-center justify-end gap-1.5 text-right transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'amount' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>AMOUNT</span>
            {sort?.key === 'amount' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'amount' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('due')}
            className={cn(
              'hidden md:inline-flex cursor-pointer items-center justify-end gap-1.5 text-right transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'due' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>DUE</span>
            {sort?.key === 'due' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'due' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('status')}
            className={cn(
              'hidden md:inline-flex cursor-pointer items-center justify-center gap-1.5 text-center transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'status' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>STATUS</span>
            {sort?.key === 'status' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'status' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
        </div>
        {rows.length > 0 ? (
          rows.map((creditor, index) => (
            <ExpenseRow
              key={creditor.id}
              creditor={creditor}
              categoryLabel={getCategoryLabel(creditor)}
              categories={categories}
              onCategoryCreate={onCategoryCreate}
              displayPrefs={displayPrefs}
              isEditing={editingId === creditor.id}
              onEditStart={() => onEditStart(creditor.id)}
              onCancelEdit={onCancelEdit}
              onSave={changes => onSave(creditor.id, changes)}
              onToggleMute={() => onToggleMute(creditor.id)}
              onArchive={() => onArchive(creditor.id)}
              variant="list"
              isLast={index === rows.length - 1}
              followsExpandedEdit={index > 0 && editingId === rows[index - 1]?.id}
            />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-(--text-tertiary)">No bills match these filters.</div>
        )}
        </div>{/* end header overflow-x-auto */}
      </div>
    </div>
  )
}
