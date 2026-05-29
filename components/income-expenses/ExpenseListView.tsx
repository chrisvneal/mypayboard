'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  matchesMasterListStatusFilter,
  plannedMonthlyPayment,
  type MasterListStatusFilter,
} from '@/lib/creditors'
import type { Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { ExpenseDisplayPrefs } from './DisplayToggle'
import { ExpenseRow, expenseListGridCols } from './ExpenseRow'

type ExpenseListViewProps = {
  creditors: Creditor[]
  categoryOptions: string[]
  categories: string[]
  editingId: string | null
  displayPrefs: ExpenseDisplayPrefs
  getCategoryLabel: (creditor: Creditor) => string
  onEditStart: (id: string) => void
  onCancelEdit: () => void
  onSave: (id: string, changes: Partial<Creditor>) => void
  onCategoryCreate: (category: string) => void
  onToggleMute: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

const ALL_CATEGORIES = 'all'
type ExpenseSort = 'name' | 'amount' | 'due'

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
  onDelete,
}: ExpenseListViewProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [status, setStatus] = useState<MasterListStatusFilter>('all')
  const [sort, setSort] = useState<ExpenseSort>('name')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return creditors
      .filter(creditor => {
        if (!matchesText(creditor.name, q)) return false
        if (category !== ALL_CATEGORIES && getCategoryLabel(creditor) !== category) return false
        if (!matchesMasterListStatusFilter(creditor, status)) return false
        return true
      })
      .sort((a, z) => {
        if (sort === 'amount') return plannedMonthlyPayment(z) - plannedMonthlyPayment(a)
        if (sort === 'due') return dueSortValue(a) - dueSortValue(z)
        return a.name.localeCompare(z.name)
      })
  }, [category, creditors, getCategoryLabel, query, sort, status])

  const controlClass =
    'min-h-9 rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-3 py-2 text-[12px] leading-tight text-(--text-secondary) outline-none transition duration-200 ease-out focus:border-(--navy)'

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_110px_120px]">
        <div className="relative min-w-0">
          <input
            className={`${controlClass} w-full pr-8`}
            placeholder="Search bills"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-secondary)"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <select className={controlClass} value={category} onChange={e => setCategory(e.target.value)}>
          <option value={ALL_CATEGORIES}>All Categories</option>
          {categoryOptions.map(option => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select className={controlClass} value={status} onChange={e => setStatus(e.target.value as typeof status)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="muted">Muted</option>
        </select>
        <select className={controlClass} value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="name">Name A-Z</option>
          <option value="amount">Amount</option>
          <option value="due">Due Date</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-t-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
        <div
          className={cn(
            'grid gap-3 border-b border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-(--text-tertiary)',
            expenseListGridCols(displayPrefs.accountNumber)
          )}
        >
          <span>Bill Name</span>
          {displayPrefs.accountNumber && <span>Account</span>}
          <span>Category</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Due</span>
          <span className="text-right">Status</span>
          <span className="text-right">Actions</span>
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
              onDelete={() => onDelete(creditor.id)}
              variant="list"
              isLast={index === rows.length - 1}
            />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-(--text-tertiary)">No expenses match these filters.</div>
        )}
      </div>
    </div>
  )
}
