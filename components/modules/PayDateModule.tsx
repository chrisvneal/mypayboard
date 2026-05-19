'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Bill, Creditor, Note, PayDateModule as PayDateModuleType, User } from '@/lib/types'
import { dueDateSortKey } from '@/lib/due-date'
import { generateId } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { AddBillInline } from './AddBillInline'
import { BillRow } from './BillRow'
import { ModuleFooter } from './ModuleFooter'
import { ModuleHeader } from './ModuleHeader'
import { ModuleTabs, type ModuleTabId } from './ModuleTabs'
import { NotesPanel } from './NotesPanel'
import { resolveHeaderVisual } from './header-colors'
import { SortableBillRow } from './SortableBillRow'

type SortKey = 'name' | 'amount' | 'dueDate'
type SortDirection = 'asc' | 'desc'

function SortHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onToggle,
  className,
}: {
  label: string
  sortKey: SortKey
  activeSortKey: SortKey | null
  direction: SortDirection
  onToggle: (key: SortKey) => void
  className?: string
}) {
  const isActive = activeSortKey === sortKey
  const Icon = isActive && direction === 'desc' ? ArrowDown : ArrowUp

  return (
    <button
      type="button"
      className={cn(
        'section-label inline-flex items-center gap-1 transition-colors duration-150 hover:text-(--text-secondary)',
        className
      )}
      onClick={() => onToggle(sortKey)}
    >
      <span>{label}</span>
      <Icon
        className={cn('size-3.5', isActive ? 'text-[#185FA5]' : 'text-(--text-tertiary)')}
        aria-hidden
      />
    </button>
  )
}

export interface PayDateModuleProps {
  module: PayDateModuleType
  boardId: string
  boardMonth: number
  boardYear: number
  allModules: PayDateModuleType[]
  creditors: Creditor[]
  currentUserId: string
  users: User[]
  highlightBillDrop?: boolean
  insertionTargetBillId?: string | null
  insertionAtEnd?: boolean
  useModuleDragOverlay?: boolean
  onUpdate: (moduleId: string, changes: Partial<PayDateModuleType>) => void
  onBillToggle: (moduleId: string, billId: string) => void
  onBillMove: (fromModuleId: string, toModuleId: string, billId: string, beforeBillId?: string) => void
  onBillAdd: (moduleId: string, bill: Bill) => void
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
  currentUserId,
  users,
  highlightBillDrop,
  insertionTargetBillId,
  insertionAtEnd,
  useModuleDragOverlay,
  onUpdate,
  onBillToggle,
  onBillMove: _onBillMove,
  onBillAdd,
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
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const ownerName = users.find(u => u.id === module.owner)?.name ?? 'Unknown'
  const payAmount = module.payAmount ?? 0

  const { remaining, totalExpenses, mutedCount, mutedTotal, allPaid, unreadCount } = useMemo(() => {
    const nonMuted = module.bills.filter(b => !b.muted)
    const spent = nonMuted.reduce((s, b) => s + b.amount, 0)
    const mutedBills = module.bills.filter(b => b.muted)
    const mutedSum = mutedBills.reduce((s, b) => s + b.amount, 0)
    const active = module.bills.filter(b => !b.muted)
    const paidComplete = active.length > 0 && active.every(b => b.paid)
    const unread = module.notes.filter(n => n.unread && n.authorId !== currentUserId).length
    return {
      remaining: payAmount - spent,
      totalExpenses: spent,
      mutedCount: mutedBills.length,
      mutedTotal: mutedSum,
      allPaid: paidComplete,
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
        allPaid,
        highlightDrop: highlightBillDrop,
      }),
    [allPaid, highlightBillDrop, module.headerColor, module.owner]
  )

  const setBillPaidPending = useCallback((billId: string, pending: boolean) => {
    setPendingPaidBillIds(prev => {
      const next = new Set(prev)
      if (pending) next.add(billId)
      else next.delete(billId)
      return next
    })
  }, [])
  const displayedBills = useMemo(() => {
    const sortBills = (bills: Bill[]) => {
      if (!sortKey) return bills
      return [...bills].sort((a, z) => {
        let result = 0
        if (sortKey === 'name') result = a.name.localeCompare(z.name)
        else if (sortKey === 'amount') result = a.amount - z.amount
        else result = dueDateSortKey(a.dueDate, boardMonth).localeCompare(dueDateSortKey(z.dueDate, boardMonth))
        return sortDirection === 'asc' ? result : -result
      })
    }

    return [...sortBills(unpaidBills), ...sortBills(paidBills)]
  }, [unpaidBills, paidBills, sortDirection, sortKey, boardMonth])
  const displayedIds = useMemo(() => displayedBills.map(b => b.id), [displayedBills])

  useEffect(() => {
    if (activeTab === 'notes') {
      onNotesRead(module.id)
    }
  }, [activeTab, module.id, onNotesRead])

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `module-${module.id}`,
    data: { type: 'module', moduleId: module.id },
  })

  const { setNodeRef: setBillDropRef } = useDroppable({
    id: `bill-zone-${module.id}`,
    data: { type: 'bill-zone', moduleId: module.id },
    disabled: activeTab !== 'unpaid',
  })

  const moduleStyle = transform && !useModuleDragOverlay
    ? {
        transform: CSS.Transform.toString(transform),
        transition: 'transform 150ms ease',
      }
    : undefined

  function handleMenuAction(action: string) {
    if (action.startsWith('set-header-color:')) {
      const hex = action.slice('set-header-color:'.length)
      onUpdate(module.id, { headerColor: hex })
      return
    }
    switch (action) {
      case 'edit-pay-date': {
        const next = window.prompt('Pay date (YYYY-MM-DD)', module.payDate)
        if (next && next.trim()) onUpdate(module.id, { payDate: next.trim() })
        break
      }
      case 'edit-pay-amount': {
        break
      }
      case 'duplicate-module':
        onModuleDuplicate(module.id)
        break
      case 'move-column': {
        const cur = module.boardColumn ?? 1
        onUpdate(module.id, { boardColumn: cur === 1 ? 2 : 1 })
        break
      }
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

  function toggleSort(nextKey: SortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey)
      setSortDirection(nextKey === 'amount' ? 'desc' : 'asc')
      return
    }
    setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'))
  }

  const setModuleCardRef = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    setBillDropRef(node)
  }

  return (
    <div
      ref={setModuleCardRef}
      style={moduleStyle}
      className={cn(
        'module-card flex min-h-[520px] flex-col overflow-visible transition-[opacity,box-shadow,border-color] duration-150 ease-out',
        isDragging && 'z-20 opacity-75 shadow-lg ring-2 ring-(--border-strong)',
        highlightBillDrop && 'border-[#185FA5] opacity-[0.85] ring-2 ring-[#185FA5]'
      )}
    >
      <ModuleHeader
        module={module}
        ownerName={ownerName}
        allPaid={allPaid}
        onPayAmountChange={amount => onUpdate(module.id, { payAmount: amount })}
        onMenuAction={handleMenuAction}
        dragAttributes={attributes}
        dragListeners={listeners}
        highlightDrop={highlightBillDrop}
      />

      <ModuleTabs
        active={activeTab}
        onChange={setActiveTab}
        unpaidCount={unpaidCount}
        paidCount={paidCount}
        allPaid={allPaid}
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
            <div className="bill-row-header mt-1 px-5 pt-3 pb-2">
              <span aria-hidden />
              <span aria-hidden />
              <span aria-hidden />
              <SortHeaderButton
                label="Bill Name"
                sortKey="name"
                activeSortKey={sortKey}
                direction={sortDirection}
                onToggle={toggleSort}
                className="min-w-0 justify-start"
              />
              <SortHeaderButton
                label="Due Date"
                sortKey="dueDate"
                activeSortKey={sortKey}
                direction={sortDirection}
                onToggle={toggleSort}
                className="bill-row-cell-due justify-center"
              />
              <SortHeaderButton
                label="Amount"
                sortKey="amount"
                activeSortKey={sortKey}
                direction={sortDirection}
                onToggle={toggleSort}
                className="bill-row-cell-amount justify-end text-right"
              />
              <span aria-hidden />
            </div>

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
          <div className="absolute inset-0 flex flex-col overflow-y-auto bg-(--bg-primary)">
            <div className="bill-list px-5 pb-3 pt-2">
            {paidBills.map(bill => (
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
            {paidBills.length === 0 && (
              <p className="py-8 text-center text-[13px] text-(--text-tertiary)">
                No paid bills yet.
              </p>
            )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="absolute inset-0 flex min-h-0 flex-col bg-(--bg-primary)">
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
        onCancel={() => setAddOpen(false)}
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
