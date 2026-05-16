'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronsUpDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Bill, Creditor, Note, PayDateModule as PayDateModuleType, User } from '@/lib/types'
import { generateId } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { AddBillInline } from './AddBillInline'
import { BillRow } from './BillRow'
import { ModuleFooter } from './ModuleFooter'
import { ModuleHeader } from './ModuleHeader'
import { ModuleTabs, type ModuleTabId } from './ModuleTabs'
import { NotesPanel } from './NotesPanel'
import { SortableBillRow } from './SortableBillRow'

export interface PayDateModuleProps {
  module: PayDateModuleType
  boardId: string
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
  const [addOpen, setAddOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'amount' | 'dueDate'>('default')

  const ownerName = users.find(u => u.id === module.owner)?.name ?? 'Unknown'
  const payAmount = module.payAmount ?? 2500

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
  const displayedBills = useMemo(() => {
    const unpaid = module.bills.filter(b => !b.paid)
    const paid = module.bills.filter(b => b.paid)

    const sortBills = (bills: Bill[]) => {
      if (sortBy === 'default') return bills
      return [...bills].sort((a, z) => {
        if (sortBy === 'name') return a.name.localeCompare(z.name)
        if (sortBy === 'amount') return z.amount - a.amount
        return (a.dueDate || '').localeCompare(z.dueDate || '')
      })
    }

    return [...sortBills(unpaid), ...sortBills(paid)]
  }, [module.bills, sortBy])
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
    if (action === 'set-header-color-clear') {
      onUpdate(module.id, { headerColor: undefined })
      return
    }

    switch (action) {
      case 'edit-pay-date': {
        const next = window.prompt('Pay date (YYYY-MM-DD)', module.payDate)
        if (next && next.trim()) onUpdate(module.id, { payDate: next.trim() })
        break
      }
      case 'edit-pay-amount': {
        const raw = window.prompt('Pay amount', String(module.payAmount))
        if (raw === null) break
        const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ''))
        if (Number.isFinite(n)) onUpdate(module.id, { payAmount: n })
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

  return (
    <div
      ref={setNodeRef}
      style={moduleStyle}
      className={cn(
        'module-card flex flex-col overflow-visible transition-[opacity,box-shadow] duration-150 ease-out',
        isDragging && 'z-20 opacity-75 shadow-lg ring-2 ring-(--border-strong)',
        highlightBillDrop && 'opacity-[0.85]'
      )}
    >
      <ModuleHeader
        module={module}
        ownerName={ownerName}
        remaining={remaining}
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
        unpaidCount={displayedBills.length}
        paidCount={paidBills.length}
        allPaid={allPaid}
        unreadNotes={unreadCount}
      />

      <div
        ref={setBillDropRef}
        className={cn(
          'min-h-[120px] flex-1 bg-(--bg-primary) transition-shadow duration-150 ease-out',
          highlightBillDrop && 'rounded-md ring-2 ring-[#185FA5] ring-offset-2 ring-offset-(--bg-primary)'
        )}
      >
        {activeTab === 'unpaid' && (
          <>
            <div className="relative flex items-center justify-end px-4 pt-3">
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] font-medium text-(--text-tertiary) hover:text-(--text-secondary)"
                onClick={() => setSortOpen(o => !o)}
              >
                Sort
                <ChevronsUpDown className="size-3.5" aria-hidden />
              </button>
              {sortOpen && (
                <div className="absolute right-4 top-full z-40 mt-1 min-w-[150px] rounded-lg border border-border bg-(--bg-primary) py-1 shadow-lg">
                  {[
                    ['name', 'Name (A-Z)'],
                    ['amount', 'Amount (high to low)'],
                    ['dueDate', 'Due Date'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className="flex w-full px-3 py-1.5 text-left text-[12px] text-(--text-primary) hover:bg-(--bg-tertiary)"
                      onClick={() => {
                        setSortBy(value as 'name' | 'amount' | 'dueDate')
                        setSortOpen(false)
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-1 pt-1.5">
              <span className="w-5 shrink-0" aria-hidden />
              <span className="w-4 shrink-0" aria-hidden />
              <span className="w-1 shrink-0" aria-hidden />
              <span className="section-label flex-[1.4]">Bill</span>
              <span className="section-label w-[72px] shrink-0">Due Date</span>
              <span className="section-label min-w-[88px] shrink-0 text-right">Amount</span>
              <span className="ml-auto w-[72px] shrink-0" aria-hidden />
            </div>

            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <div className="relative px-3 pb-1">
                {displayedBills.map(bill => (
                  <SortableBillRow
                    key={bill.id}
                    bill={bill}
                    moduleId={module.id}
                    showInsertionLine={insertionTargetBillId === bill.id}
                    onTogglePaid={() => onBillToggle(module.id, bill.id)}
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
                {insertionAtEnd && (
                  <div className="h-0.5 bg-[#185FA5]" aria-hidden />
                )}
              </div>
            </SortableContext>

            <AddBillInline
              open={addOpen}
              creditors={creditors}
              onCancel={() => setAddOpen(false)}
              onAdd={bill => {
                onBillAdd(module.id, bill)
                setAddOpen(false)
              }}
            />
          </>
        )}

        {activeTab === 'paid' && (
          <div className="px-3 pb-3 pt-2">
            {paidBills.map(bill => (
              <BillRow
                key={bill.id}
                bill={bill}
                moduleId={module.id}
                onTogglePaid={() => onBillToggle(module.id, bill.id)}
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
        )}

        {activeTab === 'notes' && (
          <NotesPanel
            notes={module.notes}
            currentUserId={currentUserId}
            onNoteDelete={noteId => onNoteDelete(module.id, noteId)}
            onNotePost={postNote}
          />
        )}
      </div>

      <ModuleFooter
        totalExpenses={totalExpenses}
        remaining={remaining}
        mutedCount={mutedCount}
        mutedTotal={mutedTotal}
        onAddBill={() => setAddOpen(true)}
      />
    </div>
  )
}
