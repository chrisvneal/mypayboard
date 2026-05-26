'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ArchiveEmptyState } from './ArchiveEmptyState'
import { ArchiveExpenseRow } from './ArchiveExpenseRow'

type ExpensesArchiveTabProps = {
  creditors: Creditor[]
  expenseCategories: string[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

type ExpenseGroup = {
  id: string
  label: string
  creditors: Creditor[]
}

const BASE_GROUPS = [
  { id: 'living', label: 'Living Expenses' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'savings', label: 'Savings' },
  { id: 'creditors', label: 'Creditors' },
]

function categoryKey(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living expenses' || normalized === 'living') return 'living'
  if (normalized === 'subscriptions' || normalized === 'subscription') return 'subscriptions'
  if (normalized === 'savings' || normalized === 'saving') return 'savings'
  if (normalized === 'creditors' || normalized === 'creditor') return 'creditors'
  return category
}

function categoryLabel(category: string, expenseCategories: string[]): string {
  const key = categoryKey(category)
  const baseGroup = BASE_GROUPS.find(group => group.id === key)
  if (baseGroup) return baseGroup.label

  return expenseCategories.find(item => categoryKey(item) === key) ?? category
}

function ArchiveCategoryGroup({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <section className="overflow-hidden rounded-lg border border-[--module-divider-color] bg-(--bg-primary) shadow-(--shadow-sm)">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(value => !value)}
        onKeyDown={e => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          setOpen(value => !value)
        }}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition duration-200 ease-out hover:bg-(--bg-secondary)',
          open && 'bg-(--navy-light) hover:bg-(--navy-light)'
        )}
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-(--text-tertiary) transition-transform duration-200 ease-out',
            open && 'rotate-90'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="truncate text-[14px] font-semibold text-(--text-primary)">{title}</h3>
            <span
              className={cn(
                'text-[12px] text-(--text-tertiary)',
                open && 'font-medium text-(--text-secondary)'
              )}
            >
              {count} archived
            </span>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[--module-divider-color]">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function ExpensesArchiveTab({
  creditors,
  expenseCategories,
  onRestore,
  onDelete,
}: ExpensesArchiveTabProps) {
  const groups = useMemo<ExpenseGroup[]>(() => {
    const byKey = new Map<string, ExpenseGroup>()

    creditors.forEach(creditor => {
      const category = String(creditor.category)
      const key = categoryKey(category)
      const existing = byKey.get(key)
      if (existing) {
        existing.creditors.push(creditor)
        return
      }

      byKey.set(key, {
        id: key,
        label: categoryLabel(category, expenseCategories),
        creditors: [creditor],
      })
    })

    const baseOrder = BASE_GROUPS.map(group => group.id)
    return Array.from(byKey.values()).sort((a, z) => {
      const aIndex = baseOrder.indexOf(a.id)
      const zIndex = baseOrder.indexOf(z.id)
      if (aIndex !== -1 || zIndex !== -1) {
        if (aIndex === -1) return 1
        if (zIndex === -1) return -1
        return aIndex - zIndex
      }
      return a.label.localeCompare(z.label)
    })
  }, [creditors, expenseCategories])

  if (creditors.length === 0) {
    return (
      <ArchiveEmptyState
        title="No archived expenses."
        description="Expenses you archive will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <ArchiveCategoryGroup key={group.id} title={group.label} count={group.creditors.length}>
          {group.creditors.map(creditor => (
            <ArchiveExpenseRow
              key={creditor.id}
              creditor={creditor}
              categoryLabel={group.label}
              onRestore={() => onRestore(creditor.id)}
              onDelete={() => onDelete(creditor.id)}
            />
          ))}
        </ArchiveCategoryGroup>
      ))}
    </div>
  )
}
