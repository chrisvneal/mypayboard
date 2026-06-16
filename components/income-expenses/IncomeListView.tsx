'use client'

import { useMemo, useState } from 'react'
import { X, ArrowDown, ArrowUp } from 'lucide-react'
import type { CategoryDefinition, Income } from '@/lib/types'
import { monthlyIncomeAmount } from '@/lib/incomes'
import { cn } from '@/lib/utils'
import { IncomeRow } from './IncomeRow'

type IncomeListViewProps = {
  incomes: Income[]
  groupOptions: CategoryDefinition[]
  editingId: string | null
  getGroupLabel: (income: Income) => string
  onGroupCreate: (group: string) => void
  onEditStart: (id: string) => void
  onCancelEdit: () => void
  onSave: (id: string, changes: Partial<Income>) => void
  onArchive: (id: string) => void
}

const ALL_GROUPS = 'all'
const ALL_OWNERS = 'all'
type IncomeOwnerFilter = typeof ALL_OWNERS | Income['owner']
type IncomeStatusFilter = 'all' | 'active' | 'muted'
type IncomeSortKey = 'name' | 'group' | 'frequency' | 'owner' | 'amount' | null
type IncomeSortDirection = 'asc' | 'desc'
type IncomeSortState = {
  key: IncomeSortKey
  direction: IncomeSortDirection
} | null

function matchesText(value: string, query: string): boolean {
  return !query || value.toLowerCase().includes(query)
}

function sortValue(income: Income, key: IncomeSortKey): string | number {
  switch (key) {
    case 'name':
      return income.name.toLowerCase()
    case 'group':
      return income.group.toLowerCase()
    case 'frequency':
      return income.frequency.toLowerCase()
    case 'owner':
      return income.owner.toLowerCase()
    case 'amount':
      return monthlyIncomeAmount(income)
    default:
      return income.name.toLowerCase()
  }
}

function compareValues(
  a: string | number,
  z: string | number,
  direction: IncomeSortDirection
): number {
  const result =
    typeof a === 'string' && typeof z === 'string'
      ? a.localeCompare(z)
      : Number(a) - Number(z)

  return direction === 'asc' ? result : -result
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
}: IncomeListViewProps) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState(ALL_GROUPS)
  const [owner, setOwner] = useState<IncomeOwnerFilter>(ALL_OWNERS)
  const [status, setStatus] = useState<IncomeStatusFilter>('all')
  const [sort, setSort] = useState<IncomeSortState>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = incomes.filter(income => {
      if (!matchesText(income.name, q)) return false
      if (group !== ALL_GROUPS && getGroupLabel(income) !== group) return false
      if (owner !== ALL_OWNERS && income.owner !== owner) return false
      if (status === 'active' && income.muted) return false
      if (status === 'muted' && !income.muted) return false
      return true
    })

    if (!sort)
      return filtered.sort((a, z) => a.name.localeCompare(z.name))

    return filtered
      .map((income, index) => ({ income, index }))
      .sort((a, z) => {
        const result = compareValues(
          sortValue(a.income, sort.key),
          sortValue(z.income, sort.key),
          sort.direction
        )
        return result || a.index - z.index
      })
      .map(({ income }) => income)
  }, [getGroupLabel, group, incomes, owner, query, sort, status])

  function toggleSort(key: IncomeSortKey) {
    setSort(current => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const controlClass =
    'field-control min-h-9 rounded-md border border-[--module-divider-color] px-3 py-2 text-[12px] leading-tight text-(--text-secondary) outline-none focus:border-(--navy)'

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,0.6fr)_124px_128px_96px]">
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
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
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
      </div>

      <div className="overflow-x-auto rounded-t-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
        <div className="min-w-[540px]">
        <div className="grid grid-cols-[minmax(140px,1.1fr)_minmax(80px,0.6fr)_90px_70px_90px_40px] gap-3 border-b border-[--module-divider-color] bg-(--bg-secondary) px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-(--text-secondary)">
          <button
            type="button"
            onClick={() => toggleSort('name')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'name' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>SOURCE NAME</span>
            {sort?.key === 'name' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'name' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('group')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'group' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>GROUP</span>
            {sort?.key === 'group' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'group' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('frequency')}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'frequency' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>FREQUENCY</span>
            {sort?.key === 'frequency' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'frequency' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSort('owner')}
            className={cn(
              'inline-flex cursor-pointer items-center justify-end gap-1.5 text-right transition-colors duration-150 hover:text-(--text-primary)',
              sort?.key === 'owner' ? 'text-(--navy)' : 'text-(--text-secondary)'
            )}
          >
            <span>PERSON</span>
            {sort?.key === 'owner' && sort.direction === 'desc' ? (
              <ArrowDown className="size-3.5 text-(--navy)" aria-hidden />
            ) : (
              <ArrowUp className={cn('size-3.5', sort?.key === 'owner' ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
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
          <span className="text-right">ACTIONS</span>
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
    </div>
  )
}
