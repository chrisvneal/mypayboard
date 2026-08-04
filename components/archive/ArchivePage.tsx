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
              id="archive-tab-expenses"
              panelId="archive-panel-expenses"
              active={activeTab === 'expenses'}
              onClick={() => setActiveTab('expenses')}
            >
              Bills ({archivedExpenses.length})
            </ArchiveTabButton>
            <ArchiveTabButton
              id="archive-tab-income"
              panelId="archive-panel-income"
              active={activeTab === 'income'}
              onClick={() => setActiveTab('income')}
            >
              Income Sources ({archivedIncome.length})
            </ArchiveTabButton>
            <ArchiveTabButton
              id="archive-tab-boards"
              panelId="archive-panel-boards"
              active={activeTab === 'boards'}
              onClick={() => setActiveTab('boards')}
            >
              Boards ({archivedBoards.length})
            </ArchiveTabButton>
          </div>

          {activeTab === 'expenses' ? (
            <div id="archive-panel-expenses" role="tabpanel" aria-labelledby="archive-tab-expenses" className="w-full min-[650px]:w-1/2">
              <ExpensesArchiveTab
                creditors={archivedExpenses}
                expenseCategories={categoryNamesForLegacyUI(data.expenseCategories)}
                onRestore={restoreExpense}
                onDelete={removeCreditor}
              />
            </div>
          ) : activeTab === 'income' ? (
            <div id="archive-panel-income" role="tabpanel" aria-labelledby="archive-tab-income" className="w-full min-[650px]:w-1/2">
              <IncomeArchiveTab
                incomes={archivedIncome}
                onRestore={restoreIncome}
                onDelete={removeIncome}
              />
            </div>
          ) : (
            <div id="archive-panel-boards" role="tabpanel" aria-labelledby="archive-tab-boards">
              <BoardsArchiveTab
                boards={archivedBoards}
                templates={data.boardTemplates}
                users={data.users}
                currentUserId={data.currentUserId}
                onRestore={restoreBoard}
                onDelete={deleteBoard}
              />
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function ArchiveTabButton({
  id,
  panelId,
  active,
  onClick,
  children,
}: {
  id: string
  panelId: string
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={panelId}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={event => {
        const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
        const currentIndex = tabs.indexOf(event.currentTarget)
        const nextIndex = event.key === 'ArrowRight'
          ? (currentIndex + 1) % tabs.length
          : event.key === 'ArrowLeft'
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : -1
        if (nextIndex < 0) return
        event.preventDefault()
        tabs[nextIndex]?.click()
        tabs[nextIndex]?.focus()
      }}
      className={cn(
        'cursor-pointer rounded-input px-4 py-1.5 text-[13px] font-medium transition-[color,background-color] duration-150 ease-out',
        active ? 'bg-(--navy-light) text-(--navy)' : 'text-(--text-tertiary) hover:bg-(--bg-secondary) hover:text-(--text-secondary)'
      )}
    >
      {children}
    </button>
  )
}
