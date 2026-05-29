'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Income } from '@/lib/types'
import { IncomeRow } from './IncomeRow'

type IncomeListViewProps = {
  incomes: Income[]
  groupOptions: string[]
  editingId: string | null
  getGroupLabel: (income: Income) => string
  onGroupCreate: (group: string) => void
  onEditStart: (id: string) => void
  onCancelEdit: () => void
  onSave: (id: string, changes: Partial<Income>) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

const ALL_GROUPS = 'all'
const ALL_OWNERS = 'all'
type IncomeOwnerFilter = typeof ALL_OWNERS | Income['owner']
type IncomeStatusFilter = 'all' | 'active' | 'muted'
type IncomeSort = 'name' | 'amount' | 'frequency'

function matchesText(value: string, query: string): boolean {
  return !query || value.toLowerCase().includes(query)
}

export function IncomeListView({
  incomes,
  groupOptions,
  editingId,
  getGroupLabel,
  onGroupCreate,
  onEditStart,
  onCancelEdit,
  onSave,
  onArchive,
  onDelete,
}: IncomeListViewProps) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState(ALL_GROUPS)
  const [owner, setOwner] = useState<IncomeOwnerFilter>(ALL_OWNERS)
  const [status, setStatus] = useState<IncomeStatusFilter>('all')
  const [sort, setSort] = useState<IncomeSort>('name')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return incomes
      .filter(income => {
        if (!matchesText(income.name, q)) return false
        if (group !== ALL_GROUPS && getGroupLabel(income) !== group) return false
        if (owner !== ALL_OWNERS && income.owner !== owner) return false
        if (status === 'active' && income.muted) return false
        if (status === 'muted' && !income.muted) return false
        return true
      })
      .sort((a, z) => {
        if (sort === 'amount') return z.amount - a.amount
        if (sort === 'frequency') return a.frequency.localeCompare(z.frequency)
        return a.name.localeCompare(z.name)
      })
  }, [getGroupLabel, group, incomes, owner, query, sort, status])

  const controlClass =
    'min-h-9 rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-3 py-2 text-[12px] leading-tight text-(--text-secondary) outline-none transition duration-200 ease-out focus:border-(--navy)'

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,0.82fr)_124px_128px_96px_112px]">
        <div className="relative min-w-0">
          <input
            className={`${controlClass} w-full pr-8`}
            placeholder="Search income"
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
        <select className={controlClass} value={group} onChange={e => setGroup(e.target.value)}>
          <option value={ALL_GROUPS}>All Groups</option>
          {groupOptions.map(option => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select className={controlClass} value={owner} onChange={e => setOwner(e.target.value as typeof owner)}>
          <option value={ALL_OWNERS}>All People</option>
          <option value="chris">Chris</option>
          <option value="nicole">Nicole</option>
          <option value="shared">Shared</option>
        </select>
        <select className={controlClass} value={status} onChange={e => setStatus(e.target.value as IncomeStatusFilter)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="muted">Muted</option>
        </select>
        <select className={controlClass} value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="name">Name A-Z</option>
          <option value="amount">Amount</option>
          <option value="frequency">Frequency</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-t-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(96px,0.7fr)_92px_64px_96px_34px] gap-3 border-b border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-(--text-tertiary)">
          <span>Source Name</span>
          <span>Group</span>
          <span>Frequency</span>
          <span className="text-right">Person</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Actions</span>
        </div>
        {rows.length > 0 ? (
          rows.map((income, index) => (
            <IncomeRow
              key={income.id}
              income={income}
              groupLabel={getGroupLabel(income)}
              groupOptions={groupOptions}
              onGroupCreate={onGroupCreate}
              isEditing={editingId === income.id}
              onEditStart={() => onEditStart(income.id)}
              onCancelEdit={onCancelEdit}
              onSave={changes => onSave(income.id, changes)}
              onArchive={() => onArchive(income.id)}
              onDelete={() => onDelete(income.id)}
              variant="list"
              isLast={index === rows.length - 1}
            />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-[13px] text-(--text-tertiary)">
            No income sources match these filters.
          </div>
        )}
      </div>
    </div>
  )
}
