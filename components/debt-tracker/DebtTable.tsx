'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { creditorDueDay, debtMinimumPayment } from '@/lib/creditors'
import type { Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DebtTableFooter } from './DebtTableFooter'
import { DebtTableRow } from './DebtTableRow'

type DebtTableProps = {
  entries: Creditor[]
}

type DebtSortKey =
  | 'name'
  | 'type'
  | 'balanceOwed'
  | 'minMonthlyPayment'
  | 'availableCredit'
  | 'creditLimit'
  | 'apr'
  | 'dueDay'
type DebtSortDirection = 'asc' | 'desc'
type DebtSortState = {
  key: DebtSortKey
  direction: DebtSortDirection
} | null

type HeaderDefinition = {
  key: DebtSortKey
  label: string
  align?: 'left' | 'right'
}

const HEADERS: HeaderDefinition[] = [
  { key: 'name', label: 'CREDITOR NAME' },
  { key: 'type', label: 'TYPE' },
  { key: 'balanceOwed', label: 'BALANCE OWED', align: 'right' },
  { key: 'minMonthlyPayment', label: 'MIN. MONTHLY PAYMENT', align: 'right' },
  { key: 'availableCredit', label: 'AVAILABLE CREDIT', align: 'right' },
  { key: 'creditLimit', label: 'CREDIT LIMIT', align: 'right' },
  { key: 'apr', label: 'APR', align: 'right' },
  { key: 'dueDay', label: 'DUE DATE', align: 'right' },
]

const sortedColumnClass =
  'bg-[color-mix(in_srgb,var(--bg-tertiary)_48%,transparent)]'

function debtType(entry: Creditor): 'revolving' | 'installment' {
  return entry.debtDetail?.type ?? 'revolving'
}

function sortValue(entry: Creditor, key: DebtSortKey): string | number | null {
  const detail = entry.debtDetail
  switch (key) {
    case 'name':
      return entry.name.toLowerCase()
    case 'type':
      return debtType(entry)
    case 'balanceOwed':
      return detail?.balanceOwed ?? 0
    case 'minMonthlyPayment':
      return debtMinimumPayment(entry)
    case 'availableCredit':
      return detail?.availableCredit ?? null
    case 'creditLimit':
      return detail?.creditLimit ?? null
    case 'apr':
      return typeof detail?.apr === 'number' ? detail.apr : null
    case 'dueDay':
      return creditorDueDay(entry)
  }
}

function compareValues(
  a: string | number | null,
  z: string | number | null,
  direction: DebtSortDirection
): number {
  if (a === null && z === null) return 0
  if (a === null) return 1
  if (z === null) return -1

  const result =
    typeof a === 'string' && typeof z === 'string'
      ? a.localeCompare(z)
      : Number(a) - Number(z)

  return direction === 'asc' ? result : -result
}

function SortHeaderButton({
  header,
  sort,
  onToggle,
}: {
  header: HeaderDefinition
  sort: DebtSortState
  onToggle: (key: DebtSortKey) => void
}) {
  const active = sort?.key === header.key
  const Icon = active && sort.direction === 'desc' ? ArrowDown : ArrowUp

  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-w-fit cursor-pointer items-center gap-1.5 transition-colors duration-150 hover:text-(--text-primary)',
        header.align === 'right' ? 'justify-end' : 'justify-start'
      )}
      onClick={() => onToggle(header.key)}
    >
      <span>{header.label}</span>
      <Icon className={cn('size-3.5', active ? 'text-(--navy)' : 'opacity-30 text-(--text-tertiary)')} aria-hidden />
    </button>
  )
}

export function DebtTable({ entries }: DebtTableProps) {
  const [sort, setSort] = useState<DebtSortState>(null)

  const sortedEntries = useMemo(() => {
    if (!sort) return entries

    return entries
      .map((entry, index) => ({ entry, index }))
      .sort((a, z) => {
        const result = compareValues(
          sortValue(a.entry, sort.key),
          sortValue(z.entry, sort.key),
          sort.direction
        )
        return result || a.index - z.index
      })
      .map(({ entry }) => entry)
  }, [entries, sort])

  const totals = useMemo(
    () =>
      entries.reduce(
        (sum, entry) => ({
          balanceOwed: sum.balanceOwed + (entry.debtDetail?.balanceOwed ?? 0),
          minMonthlyPayment: sum.minMonthlyPayment + debtMinimumPayment(entry),
          availableCredit: sum.availableCredit + (entry.debtDetail?.availableCredit ?? 0),
          creditLimit: sum.creditLimit + (entry.debtDetail?.creditLimit ?? 0),
          hasCreditColumns: sum.hasCreditColumns || debtType(entry) === 'revolving',
        }),
        {
          balanceOwed: 0,
          minMonthlyPayment: 0,
          availableCredit: 0,
          creditLimit: 0,
          hasCreditColumns: false,
        }
      ),
    [entries]
  )

  function toggleSort(key: DebtSortKey) {
    setSort(current => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  return (
    <div
      className="overflow-hidden rounded-lg bg-(--bg-primary) shadow-(--shadow-sm)"
      style={{ border: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] border-collapse">
          <thead className="bg-(--bg-secondary)">
            <tr
              className="text-[11px] font-medium uppercase tracking-wider text-(--text-secondary)"
              style={{ borderBottom: '0.5px solid var(--color-border-tertiary, var(--module-divider-color))' }}
            >
              {HEADERS.map(header => (
                <th
                  key={header.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 font-medium transition-colors duration-150',
                    // Active sort = persistent tint; otherwise a lighter, transient
                    // hover tint signals the column is clickable/sortable.
                    sort?.key === header.key
                      ? sortedColumnClass
                      : 'hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_26%,transparent)]'
                  )}
                >
                  <SortHeaderButton header={header} sort={sort} onToggle={toggleSort} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEntries.length > 0 ? (
              sortedEntries.map(entry => (
                <DebtTableRow key={entry.id} entry={entry} activeSortKey={sort?.key ?? null} />
              ))
            ) : (
              <tr>
                <td colSpan={HEADERS.length} className="px-4 py-8 text-center text-[13px] text-(--text-tertiary)">
                  No debt accounts match this filter.
                </td>
              </tr>
            )}
          </tbody>
          <DebtTableFooter
            balanceOwed={totals.balanceOwed}
            minMonthlyPayment={totals.minMonthlyPayment}
            availableCredit={totals.availableCredit}
            creditLimit={totals.creditLimit}
            showCreditTotals={totals.hasCreditColumns}
            activeSortKey={sort?.key ?? null}
          />
        </table>
      </div>
    </div>
  )
}
