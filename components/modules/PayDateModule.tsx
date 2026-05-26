'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bill, Creditor, Note, PayDateModule as PayDateModuleType, User } from '@/lib/types'
import { generateId } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { AddBillInline } from './AddBillInline'
import { BillRow } from './BillRow'
import { ModuleFooter } from './ModuleFooter'
import { ModuleHeader } from './ModuleHeader'
import { ModuleTabs, type ModuleTabId } from './ModuleTabs'
import { NotesPanel } from './NotesPanel'
import { resolveHeaderVisual } from './header-colors'
import { ModuleBillTableHeader, type BillSortDirection, type BillSortKey } from './ModuleBillTableHeader'
import { SortableBillRow } from './SortableBillRow'
import { sortBills } from './sort-bills'

export interface PayDateModuleProps {
  module: PayDateModuleType
  boardId: string
  boardMonth: number
  boardYear: number
  allModules: PayDateModuleType[]
  creditors: Creditor[]
  expenseCategories: string[]
  currentUserId: string
  users: User[]
  highlightBillDrop?: boolean
  insertionTargetBillId?: string | null
  insertionLineAfter?: boolean
  insertionAtEnd?: boolean
  onUpdate: (moduleId: string, changes: Partial<PayDateModuleType>) => void
  onBillToggle: (moduleId: string, billId: string) => void
  onBillMove: (fromModuleId: string, toModuleId: string, billId: string, beforeBillId?: string) => void
  onBillAdd: (moduleId: string, bill: Bill) => void
  onCreditorAdd: (creditor: Creditor) => void
  onBillUpdate: (moduleId: string, billId: string, changes: Partial<Bill>) => void
  onBillRemove: (moduleId: string, billId: string) => void
  onNoteAdd: (moduleId: string, note: Note) => void
  onNoteDelete: (moduleId: string, noteId: string) => void
  onNotesRead: (moduleId: string) => void
  onModuleRemove: (moduleId: string) => void
  onModuleDuplicate: (moduleId: string) => void
}

export function PayDateModule({
  module,
  boardId: _boardId,
  boardMonth,
  boardYear,
  allModules: _allModules,
  creditors,
  expenseCategories,
  currentUserId,
  users,
  highlightBillDrop,
  insertionTargetBillId,
  insertionLineAfter,
  insertionAtEnd,
  onUpdate,
  onBillToggle,
  onBillMove: _onBillMove,
  onBillAdd,
  onCreditorAdd,
  onBillUpdate,
  onBillRemove,
  onNoteAdd,
  onNoteDelete,
  onNotesRead,
  onModuleRemove,
  onModuleDuplicate,
}: PayDateModuleProps) {
  void _boardId
  void _allModules
  void _onBillMove

  const [activeTab, setActiveTab] = useState<ModuleTabId>('unpaid')
  const [pendingPaidBillIds, setPendingPaidBillIds] = useState<Set<string>>(() => new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [sortKey, setSortKey] = useState<BillSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<BillSortDirection>('asc')

  const ownerName = users.find(u => u.id === module.owner)?.name ?? 'Unknown'
  const payAmount = module.payAmount ?? 0

  const { remaining, totalExpenses, mutedCount, mutedTotal, unreadCount } = useMemo(() => {
    const nonMuted = module.bills.filter(b => !b.muted)
    const spent = nonMuted.reduce((s, b) => s + b.amount, 0)
    const mutedBills = module.bills.filter(b => b.muted)
    const mutedSum = mutedBills.reduce((s, b) => s + b.amount, 0)
    const unread = module.notes.filter(n => n.unread && n.authorId !== currentUserId).length
    return {
      remaining: payAmount - spent,
      totalExpenses: spent,
      mutedCount: mutedBills.length,
      mutedTotal: mutedSum,
      unreadCount: unread,
    }
  }, [module.bills, module.notes, payAmount, currentUserId])

  const paidBills = useMemo(() => module.bills.filter(b => b.paid), [module.bills])
  const unpaidBills = useMemo(() => module.bills.filter(b => !b.paid), [module.bills])

  const unpaidCount = useMemo(
    () => module.bills.filter(b => !b.paid && !pendingPaidBillIds.has(b.id)).length,
    [module.bills, pendingPaidBillIds]
  )
  const paidCount = useMemo(
    () => module.bills.filter(b => b.paid || pendingPaidBillIds.has(b.id)).length,
    [module.bills, pendingPaidBillIds]
  )

  const headerVisual = useMemo(
    () =>
      resolveHeaderVisual({
        headerColor: module.headerColor,
        ownerId: module.owner,
        highlightDrop: highlightBillDrop,
      }),
    [highlightBillDrop, module.headerColor, module.owner]
  )

  const setBillPaidPending = useCallback((billId: string, pending: boolean) => {
    setPendingPaidBillIds(prev => {
      const next = new Set(prev)
      if (pending) next.add(billId)
      else next.delete(billId)
      return next
    })
  }, [])
  const displayedBills = useMemo(
    () => [
      ...sortBills(unpaidBills, sortKey, sortDirection, boardMonth),
      ...sortBills(paidBills, sortKey, sortDirection, boardMonth),
    ],
    [unpaidBills, paidBills, sortDirection, sortKey, boardMonth]
  )
  const sortedPaidBills = useMemo(
    () => sortBills(paidBills, sortKey, sortDirection, boardMonth),
    [paidBills, sortDirection, sortKey, boardMonth]
  )
  const displayedIds = useMemo(() => displayedBills.map(b => b.id), [displayedBills])

  useEffect(() => {
    if (activeTab === 'notes') {
      onNotesRead(module.id)
    }
  }, [activeTab, module.id, onNotesRead])

  const { setNodeRef: setBillDropRef } = useDroppable({
    id: `bill-zone-${module.id}`,
    data: { type: 'bill-zone', moduleId: module.id },
    disabled: activeTab !== 'unpaid',
  })

  function handleMenuAction(action: string) {
    if (action.startsWith('set-header-color:')) {
      const hex = action.slice('set-header-color:'.length)
      onUpdate(module.id, { headerColor: hex })
      return
    }
    switch (action) {
      case 'edit-pay-amount': {
        break
      }
      case 'duplicate-module':
        onModuleDuplicate(module.id)
        break
      case 'remove-module':
        onModuleRemove(module.id)
        break
      default:
        break
    }
  }

  function postNote(text: string) {
    const authorName = users.find(u => u.id === currentUserId)?.name ?? 'You'
    const note: Note = {
      id: generateId('note'),
      authorId: currentUserId,
      authorName,
      text,
      timestamp: new Date().toISOString(),
      unread: true,
    }
    onNoteAdd(module.id, note)
  }

  function toggleSort(nextKey: BillSortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey)
      setSortDirection(nextKey === 'amount' ? 'desc' : 'asc')
      return
    }
    setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div
      ref={setBillDropRef}
      className={cn(
        'module-card flex min-h-[520px] flex-col overflow-visible transition-[box-shadow,border-color] duration-150 ease-out',
        highlightBillDrop && 'border-[#185FA5] opacity-[0.85] ring-2 ring-[#185FA5]'
      )}
    >
      <ModuleHeader
        module={module}
        ownerName={ownerName}
        onPayAmountChange={amount => onUpdate(module.id, { payAmount: amount })}
        onPayDateChange={payDate => onUpdate(module.id, { payDate })}
        onMenuAction={handleMenuAction}
        highlightDrop={highlightBillDrop}
      />

      <ModuleTabs
        active={activeTab}
        onChange={setActiveTab}
        unpaidCount={unpaidCount}
        paidCount={paidCount}
        unreadNotes={unreadCount}
        headerVisual={headerVisual}
      />

      <div
        className={cn(
          'relative flex min-h-[300px] flex-1 flex-col bg-(--bg-primary) transition-[background-color] duration-150 ease-out',
          highlightBillDrop && 'bg-[color-mix(in_srgb,var(--bg-primary)_85%,transparent)]'
        )}
      >
        <div
          className={cn(
            'flex flex-col',
            activeTab !== 'unpaid' && 'pointer-events-none invisible select-none'
          )}
          aria-hidden={activeTab !== 'unpaid'}
        >
            <ModuleBillTableHeader
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={toggleSort}
            />

            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <div className="bill-list relative px-5 pb-2">
                {displayedBills.map(bill => (
                  <SortableBillRow
                    key={bill.id}
                    bill={bill}
                    moduleId={module.id}
                    boardMonth={boardMonth}
                    boardYear={boardYear}
                    showInsertionLine={activeTab === 'unpaid' && insertionTargetBillId === bill.id}
                    insertionLineAfter={insertionLineAfter}
                    onTogglePaid={() => onBillToggle(module.id, bill.id)}
                    onPaidPendingChange={pending =>
                      setBillPaidPending(bill.id, pending)
                    }
                    onUpdate={changes => onBillUpdate(module.id, bill.id, changes)}
                    onRemove={() => onBillRemove(module.id, bill.id)}
                    onMute={() => onBillUpdate(module.id, bill.id, { muted: !bill.muted })}
                    onColorChange={hex =>
                      onBillUpdate(module.id, bill.id, {
                        rowColor: hex,
                      })
                    }
                  />
                ))}
                {activeTab === 'unpaid' && insertionAtEnd && (
                  <div className="relative py-2" aria-hidden>
                    <div className="mx-1 h-0.5 rounded-full bg-[#185FA5]" />
                  </div>
                )}
              </div>
            </SortableContext>
        </div>

        {activeTab === 'paid' && (
          <div className="module-tab-overlay">
            {paidBills.length === 0 ? (
              <>
                <div className="module-tab-content-zone is-empty">
                  <p className="module-tab-empty">No paid bills yet.</p>
                </div>
                <div className="module-tab-composer-spacer" aria-hidden />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <ModuleBillTableHeader
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                />
                <div className="module-tab-content-zone scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-3">
                  <div className="bill-list">
                    {sortedPaidBills.map(bill => (
                      <BillRow
                        key={bill.id}
                        bill={bill}
                        moduleId={module.id}
                        boardMonth={boardMonth}
                        boardYear={boardYear}
                        onTogglePaid={() => onBillToggle(module.id, bill.id)}
                        onPaidPendingChange={pending => setBillPaidPending(bill.id, pending)}
                        onUpdate={changes => onBillUpdate(module.id, bill.id, changes)}
                        onRemove={() => onBillRemove(module.id, bill.id)}
                        onMute={() => onBillUpdate(module.id, bill.id, { muted: !bill.muted })}
                        onColorChange={hex =>
                          onBillUpdate(module.id, bill.id, {
                            rowColor: hex,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="module-tab-overlay">
            <NotesPanel
              notes={module.notes}
              currentUserId={currentUserId}
              onNoteDelete={noteId => onNoteDelete(module.id, noteId)}
              onNotePost={postNote}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setActiveTab('unpaid')
          setAddOpen(true)
        }}
        className={cn(
          'add-bill-row group flex w-full items-center gap-2 px-5 py-2 text-[13px] font-normal text-(--text-tertiary)',
          addOpen ? 'text-(--text-secondary)' : 'hover:text-(--text-secondary)'
        )}
      >
        <Plus
          className="size-3.5 shrink-0 opacity-70 transition-colors duration-150 group-hover:opacity-100"
          aria-hidden
        />
        <span>Add bill</span>
      </button>

      <AddBillInline
        open={addOpen}
        boardMonth={boardMonth}
        boardYear={boardYear}
        creditors={creditors}
        expenseCategories={expenseCategories}
        onCancel={() => setAddOpen(false)}
        onCreditorAdd={onCreditorAdd}
        onAdd={bill => {
          onBillAdd(module.id, bill)
          setAddOpen(false)
        }}
      />

      <ModuleFooter
        totalExpenses={totalExpenses}
        remaining={remaining}
        mutedCount={mutedCount}
        mutedTotal={mutedTotal}
      />
    </div>
  )
}
