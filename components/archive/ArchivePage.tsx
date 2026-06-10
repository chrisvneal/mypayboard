'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isExplicitlyArchivedCreditor } from '@/lib/creditors'
import { categoryNamesForLegacyUI } from '@/lib/category-definitions'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { ArchiveEmptyState } from './ArchiveEmptyState'
import { BoardsArchiveTab } from './BoardsArchiveTab'
import { ExpensesArchiveTab } from './ExpensesArchiveTab'
import { IncomeArchiveTab } from './IncomeArchiveTab'

type ArchiveTab = 'expenses' | 'income' | 'boards'

export function ArchivePage() {
  const {
    data,
    isLoaded,
    updateCreditor,
    removeCreditor,
    updateIncome,
    removeIncome,
    updateBoard,
    deleteBoard,
  } = useMyPayBoard()

  const archivedExpenses = useMemo(
    () => data.creditors.filter(isExplicitlyArchivedCreditor),
    [data.creditors]
  )
  const archivedIncome = useMemo(
    () => data.incomes.filter(income => income.archived === true),
    [data.incomes]
  )
  const archivedBoards = useMemo(
    () => data.boards.filter(board => board.status === 'archived'),
    [data.boards]
  )

  const defaultTab: ArchiveTab = archivedExpenses.length > 0
    ? 'expenses'
    : archivedIncome.length > 0
      ? 'income'
      : 'boards'
  const [activeTab, setActiveTab] = useState<ArchiveTab>('expenses')
  const defaultTabApplied = useRef(false)

  useEffect(() => {
    if (!isLoaded || defaultTabApplied.current) return
    setActiveTab(defaultTab)
    defaultTabApplied.current = true
  }, [defaultTab, isLoaded])

  const hasArchivedItems = archivedExpenses.length > 0 || archivedIncome.length > 0 || archivedBoards.length > 0
  const subtitle = !hasArchivedItems
    ? 'Archived items can be restored at any time.'
    : activeTab === 'expenses'
      ? 'Archived expenses can be restored at any time.'
      : activeTab === 'income'
        ? 'Archived income sources can be restored at any time.'
        : 'Archived month boards can be restored at any time.'

  function restoreExpense(id: string) {
    updateCreditor(id, { archived: false, active: true })
  }

  function restoreIncome(id: string) {
    updateIncome(id, { archived: false, active: true })
  }

  function restoreBoard(id: string) {
    updateBoard(id, { status: 'preparing' })
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
              Bills ({archivedExpenses.length})
            </ArchiveTabButton>
            <ArchiveTabButton
              active={activeTab === 'income'}
              onClick={() => setActiveTab('income')}
            >
              Income Sources ({archivedIncome.length})
            </ArchiveTabButton>
            <ArchiveTabButton
              active={activeTab === 'boards'}
              onClick={() => setActiveTab('boards')}
            >
              Boards ({archivedBoards.length})
            </ArchiveTabButton>
          </div>

          {activeTab === 'expenses' ? (
            <ExpensesArchiveTab
              creditors={archivedExpenses}
              expenseCategories={categoryNamesForLegacyUI(data.expenseCategories)}
              onRestore={restoreExpense}
              onDelete={removeCreditor}
            />
          ) : activeTab === 'income' ? (
            <IncomeArchiveTab
              incomes={archivedIncome}
              onRestore={restoreIncome}
              onDelete={removeIncome}
            />
          ) : (
            <BoardsArchiveTab
              boards={archivedBoards}
              users={data.users}
              onRestore={restoreBoard}
              onDelete={deleteBoard}
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
