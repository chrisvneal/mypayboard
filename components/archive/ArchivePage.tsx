'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isExplicitlyArchivedCreditor } from '@/lib/creditors'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { ArchiveEmptyState } from './ArchiveEmptyState'
import { ExpensesArchiveTab } from './ExpensesArchiveTab'
import { IncomeArchiveTab } from './IncomeArchiveTab'

type ArchiveTab = 'expenses' | 'income'

export function ArchivePage() {
  const {
    data,
    isLoaded,
    updateCreditor,
    removeCreditor,
    updateIncome,
    removeIncome,
  } = useMyPayBoard()

  const archivedExpenses = useMemo(
    () => data.creditors.filter(isExplicitlyArchivedCreditor),
    [data.creditors]
  )
  const archivedIncome = useMemo(
    () => data.incomes.filter(income => income.archived === true),
    [data.incomes]
  )

  const defaultTab: ArchiveTab = archivedExpenses.length > 0 ? 'expenses' : 'income'
  const [activeTab, setActiveTab] = useState<ArchiveTab>('expenses')
  const defaultTabApplied = useRef(false)

  useEffect(() => {
    if (!isLoaded || defaultTabApplied.current) return
    setActiveTab(defaultTab)
    defaultTabApplied.current = true
  }, [defaultTab, isLoaded])

  const hasArchivedItems = archivedExpenses.length > 0 || archivedIncome.length > 0
  const subtitle = !hasArchivedItems
    ? 'Archived items can be restored at any time.'
    : activeTab === 'expenses'
      ? 'Archived expenses can be restored at any time.'
      : 'Archived income sources can be restored at any time.'

  function restoreExpense(id: string) {
    updateCreditor(id, { archived: false, active: true })
  }

  function restoreIncome(id: string) {
    updateIncome(id, { archived: false, active: true })
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Archive</h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-(--text-secondary)">
          {subtitle}
        </p>
      </header>

      {!isLoaded ? (
        <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary) shadow-(--shadow-sm)">
          Loading archive...
        </div>
      ) : !hasArchivedItems ? (
        <ArchiveEmptyState
          variant="full"
          title="Your archive is empty."
          description="Items you archive from the Expenses & Income page will appear here."
        />
      ) : (
        <section className="space-y-6">
          <div
            className="inline-flex items-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-1 shadow-(--shadow-sm)"
            role="tablist"
            aria-label="Archive sections"
          >
            <ArchiveTabButton
              active={activeTab === 'expenses'}
              onClick={() => setActiveTab('expenses')}
            >
              Expenses ({archivedExpenses.length})
            </ArchiveTabButton>
            <ArchiveTabButton
              active={activeTab === 'income'}
              onClick={() => setActiveTab('income')}
            >
              Income Sources ({archivedIncome.length})
            </ArchiveTabButton>
          </div>

          {activeTab === 'expenses' ? (
            <ExpensesArchiveTab
              creditors={archivedExpenses}
              expenseCategories={data.expenseCategories}
              onRestore={restoreExpense}
              onDelete={removeCreditor}
            />
          ) : (
            <IncomeArchiveTab
              incomes={archivedIncome}
              onRestore={restoreIncome}
              onDelete={removeIncome}
            />
          )}
        </section>
      )}
    </div>
  )
}

function ArchiveTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-md px-4 py-1.5 text-[13px] font-medium transition-[color,background-color] duration-150 ease-out',
        active ? 'bg-(--navy-light) text-(--navy)' : 'text-(--text-tertiary) hover:bg-(--bg-secondary) hover:text-(--text-secondary)'
      )}
    >
      {children}
    </button>
  )
}
