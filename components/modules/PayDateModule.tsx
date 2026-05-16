'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

  const ownerName = users.find(u => u.id === module.owner)?.name ?? 'Unknown'

  const { remaining, totalExpenses, mutedCount, mutedTotal, allPaid, unreadCount } = useMemo(() => {
    const nonMuted = module.bills.filter(b => !b.muted)
    const spent = nonMuted.reduce((s, b) => s + b.amount, 0)
    const mutedBills = module.bills.filter(b => b.muted)
    const mutedSum = mutedBills.reduce((s, b) => s + b.amount, 0)
    const active = module.bills.filter(b => !b.muted)
    const paidComplete = active.length > 0 && active.every(b => b.paid)
    const unread = module.notes.filter(n => n.unread && n.authorId !== currentUserId).length
    return {
      remaining: module.payAmount - spent,
      totalExpenses: spent,
      mutedCount: mutedBills.length,
      mutedTotal: mutedSum,
      allPaid: paidComplete,
      unreadCount: unread,
    }
  }, [module.bills, module.notes, module.payAmount, currentUserId])

  const unpaidBills = useMemo(() => module.bills.filter(b => !b.paid), [module.bills])
  const paidBills = useMemo(() => module.bills.filter(b => b.paid), [module.bills])
  const unpaidIds = useMemo(() => unpaidBills.map(b => b.id), [unpaidBills])

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

  const moduleStyle = transform
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
        isDragging && 'z-20 opacity-75 shadow-lg ring-2 ring-(--border-strong)'
      )}
    >
      <ModuleHeader
        module={module}
        ownerName={ownerName}
        remaining={remaining}
        allPaid={allPaid}
        onMenuAction={handleMenuAction}
        dragAttributes={attributes}
        dragListeners={listeners}
      />

      <ModuleTabs
        active={activeTab}
        onChange={setActiveTab}
        unpaidCount={unpaidBills.length}
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
            <div className="flex gap-2 px-4 pb-1 pt-3">
              <span className="w-5 shrink-0" aria-hidden />
              <span className="w-4 shrink-0" aria-hidden />
              <span className="w-1 shrink-0" aria-hidden />
              <span className="section-label flex-[1.4]">Bill</span>
              <span className="section-label w-[72px] shrink-0">Due Date</span>
              <span className="section-label min-w-[88px] shrink-0 text-right">Amount</span>
              <span className="ml-auto w-[72px] shrink-0" aria-hidden />
            </div>

            <SortableContext items={unpaidIds} strategy={verticalListSortingStrategy}>
              <div className="px-3 pb-1">
                {unpaidBills.map(bill => (
                  <SortableBillRow
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
