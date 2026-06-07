'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BoardMode } from '@/lib/board-workspace-types'
import type { Bill, Creditor, Note, PayDateCard, User } from '@/lib/types'
import { filterMasterListPickerCreditors } from '@/lib/creditors'
import { ASAP_DUE_DATE, formatDueDateDisplay, isAsapDueDate } from '@/lib/due-date'
import { generateId } from '@/lib/format'
import { getModuleFooterStats } from '@/lib/module-totals'
import { cn } from '@/lib/utils'
import { AddBillInline } from './AddBillInline'
import { BillRow } from './BillRow'
import type { ModuleActions } from './module-actions'
import { ModuleFooter } from './ModuleFooter'
import { ModuleHeader } from './ModuleHeader'
import { ModuleTabs, type ModuleTabId } from './ModuleTabs'
import { NotesPanel } from './NotesPanel'
import { resolveHeaderVisual } from './header-colors'
import { ModuleBillTableHeader, type BillSortDirection, type BillSortKey } from './ModuleBillTableHeader'
import { SortableBillRow } from './SortableBillRow'
import {
  isBillArchivedInMasterList,
  masterListIdForTemplateBill,
} from '@/lib/template-archived-bills'
import { sortBills } from './sort-bills'

export type { ModuleActions } from './module-actions'

export interface PayDateCardProps {
  card: PayDateCard
  boardId: string
  boardMonth: number
  boardYear: number
  /** Live month board vs template blueprint editing */
  boardMode?: BoardMode
  allCards: PayDateCard[]
  creditors: Creditor[]
  expenseCategories: string[]
  currentUserId: string
  users: User[]
  incomeSources: string[]
  /** Current user's personal header color for this card (undefined = use shared/owner default). */
  headerColorOverride?: string
  actions: ModuleActions
  highlightBillDrop?: boolean
  insertionTargetBillId?: string | null
  insertionLineAfter?: boolean
  insertionAtEnd?: boolean
}

function readBillDueDay(dateStr: string, boardMonth: number): Creditor['dueDay'] {
  const trimmed = dateStr.trim()
  if (!trimmed) return null
  if (isAsapDueDate(trimmed)) return 'asap'
  if (trimmed.toLowerCase() === 'varies') return 'varies'

  const recurring = /^\*\/(\d{1,2})$/.exec(trimmed)
  if (recurring) return Number(recurring[1])

  const display = formatDueDateDisplay(trimmed, boardMonth)
  const parts = display.split('/')
  if (parts.length === 2) return Number(parts[1]) || null

  return null
}

function duePatternFromDueDay(dueDay: Creditor['dueDay']): string {
  if (typeof dueDay === 'number') return `*/${dueDay}`
  if (dueDay === 'asap') return ASAP_DUE_DATE
  return ''
}

export function PayDateCard({
  card,
  boardId: _boardId,
  boardMonth,
  boardYear,
  boardMode = 'live',
  allCards: _allCards,
  creditors,
  expenseCategories,
  currentUserId,
  users,
  incomeSources,
  headerColorOverride,
  highlightBillDrop,
  insertionTargetBillId,
  insertionLineAfter,
  insertionAtEnd,
  actions,
}: PayDateCardProps) {
  const {
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
    onPayDateCardRemove,
    onPayDateCardDuplicate,
    onHeaderColorSet,
    onRestoreCreditorInMasterList,
  } = actions

  // Personal override wins; otherwise fall back to the shared card/owner default.
  const effectiveHeaderColor = headerColorOverride ?? card.headerColor

  void _boardId
  void _allCards
  void _onBillMove

  const pickerCreditors = useMemo(
    () => filterMasterListPickerCreditors(creditors),
    [creditors]
  )

  const [activeTab, setActiveTab] = useState<ModuleTabId>('unpaid')
  const [pendingPaidBillIds, setPendingPaidBillIds] = useState<Set<string>>(() => new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [sortKey, setSortKey] = useState<BillSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<BillSortDirection>('asc')

  const ownerName = users.find(u => u.id === card.owner)?.name ?? 'Unknown'

  const { remaining, totalExpenses, mutedCount, mutedTotal, unreadCount } = useMemo(
    () => getModuleFooterStats(card, currentUserId),
    [card, currentUserId]
  )

  const paidBills = useMemo(() => card.bills.filter(b => b.paid), [card.bills])
  const unpaidBills = useMemo(() => card.bills.filter(b => !b.paid), [card.bills])

  const unpaidCount = useMemo(
    () => card.bills.filter(b => !b.paid && !pendingPaidBillIds.has(b.id)).length,
    [card.bills, pendingPaidBillIds]
  )
  const paidCount = useMemo(
    () => card.bills.filter(b => b.paid || pendingPaidBillIds.has(b.id)).length,
    [card.bills, pendingPaidBillIds]
  )

  const headerVisual = useMemo(
    () =>
      resolveHeaderVisual({
        headerColor: effectiveHeaderColor,
        ownerId: card.owner,
        highlightDrop: highlightBillDrop,
      }),
    [highlightBillDrop, effectiveHeaderColor, card.owner]
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
      onNotesRead(card.id)
    }
  }, [activeTab, card.id, onNotesRead])

  const handleTabChange = useCallback(
    (tab: ModuleTabId) => {
      if (boardMode === 'live' && tab !== 'unpaid') {
        setAddOpen(false)
      }
      setActiveTab(tab)
    },
    [boardMode]
  )

  const { setNodeRef: setBillDropRef } = useDroppable({
    id: `bill-zone-${card.id}`,
    data: { type: 'bill-zone', cardId: card.id },
    disabled: activeTab !== 'unpaid',
  })

  function handleMenuAction(action: string) {
    if (action.startsWith('set-header-color:')) {
      const hex = action.slice('set-header-color:'.length)
      onHeaderColorSet(card, hex)
      return
    }
    switch (action) {
      case 'edit-pay-amount': {
        break
      }
      case 'duplicate-card':
        onPayDateCardDuplicate(card)
        break
      case 'remove-card':
        onPayDateCardRemove(card.id)
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
    onNoteAdd(card.id, note)
  }

  function toggleSort(nextKey: BillSortKey) {
    if (sortKey !== nextKey) {
      setSortKey(nextKey)
      setSortDirection(nextKey === 'amount' ? 'desc' : 'asc')
      return
    }
    setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'))
  }

  const saveBillToMaster = useCallback(
    (bill: Bill) => {
      if (bill.promotedToMaster) return

      const now = new Date().toISOString()
      const dueDay = readBillDueDay(bill.dueDate, boardMonth)
      const creditor: Creditor = {
        id: generateId('creditor'),
        name: bill.name.trim() || 'One-off bill',
        category: bill.category ?? 'Miscellaneous',
        defaultAmount: bill.amount,
        dueDay,
        dueDatePattern: duePatternFromDueDay(dueDay),
        notes: bill.notes ?? '',
        active: true,
        muted: false,
        archived: false,
        tags: [],
        createdAt: now,
        updatedAt: now,
      }

      onCreditorAdd(creditor)
      onBillUpdate(card.id, bill.id, {
        creditorId: creditor.id,
        origin: 'master',
        promotedToMaster: true,
      })
    },
    [boardMonth, card.id, onBillUpdate, onCreditorAdd]
  )

  return (
    <div
      ref={setBillDropRef}
      className={cn(
        'module-card flex flex-col overflow-visible transition-[box-shadow,border-color] duration-150 ease-out',
        boardMode === 'template'
          ? 'template-module-card min-h-0'
          : 'live-module-card min-h-[18rem]',
        highlightBillDrop && 'border-[#185FA5] opacity-[0.85] ring-2 ring-[#185FA5]'
      )}
    >
      <ModuleHeader
        card={card}
        boardMode={boardMode}
        headerColor={effectiveHeaderColor}
        ownerName={ownerName}
        users={users}
        incomeSources={incomeSources}
        onOwnerChange={owner => onUpdate(card.id, { owner })}
        onSourceChange={source => onUpdate(card.id, { source })}
        onPayAmountChange={amount => onUpdate(card.id, { payAmount: amount })}
        onPayDateChange={payDate => onUpdate(card.id, { payDate })}
        onMenuAction={handleMenuAction}
        highlightDrop={highlightBillDrop}
      />

      <ModuleTabs
        active={activeTab}
        onChange={handleTabChange}
        unpaidCount={unpaidCount}
        paidCount={paidCount}
        unreadNotes={unreadCount}
        headerVisual={headerVisual}
        boardMode={boardMode}
        totalBillCount={card.bills.length}
      />

      <div
        className={cn(
          'relative flex flex-col bg-(--bg-primary) transition-[background-color] duration-150 ease-out',
          boardMode === 'live' ? 'live-module-body flex-1' : 'min-h-0 flex-none',
          highlightBillDrop && 'bg-[color-mix(in_srgb,var(--bg-primary)_85%,transparent)]'
        )}
      >
        {boardMode === 'template' ? (
          <div className="flex flex-col">
            <ModuleBillTableHeader
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={toggleSort}
              compact
            />

            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <div className="bill-list scrollbar-thin relative max-h-[min(52vh,420px)] overflow-x-hidden overflow-y-auto pb-2">
                {displayedBills.map(bill => {
                  const archivedInMaster = isBillArchivedInMasterList(bill, creditors)
                  return (
                    <SortableBillRow
                      key={bill.id}
                      bill={bill}
                      cardId={card.id}
                      boardMonth={boardMonth}
                      boardYear={boardYear}
                      dragDisabled={sortKey !== null}
                      compact
                      showInsertionLine={insertionTargetBillId === bill.id}
                      insertionLineAfter={insertionLineAfter}
                      onTogglePaid={() => onBillToggle(card.id, bill.id)}
                      hidePaidControl
                      archivedInMasterList={archivedInMaster}
                      onRestoreInMasterList={
                        archivedInMaster && onRestoreCreditorInMasterList
                          ? () => onRestoreCreditorInMasterList(masterListIdForTemplateBill(bill))
                          : undefined
                      }
                      onRemoveFromTemplate={
                        archivedInMaster ? () => onBillRemove(card.id, bill.id) : undefined
                      }
                      onPaidPendingChange={pending => setBillPaidPending(bill.id, pending)}
                      onUpdate={changes => onBillUpdate(card.id, bill.id, changes)}
                      onRemove={() => onBillRemove(card.id, bill.id)}
                      onMute={() => onBillUpdate(card.id, bill.id, { muted: !bill.muted })}
                      onSaveToMaster={() => saveBillToMaster(bill)}
                      onColorChange={hex =>
                        onBillUpdate(card.id, bill.id, {
                          rowColor: hex,
                        })
                      }
                    />
                  )
                })}
                {insertionAtEnd && (
                  <div className="relative py-2" aria-hidden>
                    <div className="mx-1 h-0.5 rounded-full bg-[#185FA5]" />
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ) : null}

        {boardMode === 'live' && activeTab === 'unpaid' && (
          <div className="live-unpaid-panel">
            <div className="live-unpaid-scroll">
              <ModuleBillTableHeader
                sortKey={sortKey}
                sortDirection={sortDirection}
                onToggleSort={toggleSort}
              />

              <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
                <div className="bill-list scrollbar-thin relative pb-2">
                  {displayedBills.map(bill => (
                    <SortableBillRow
                      key={bill.id}
                      bill={bill}
                      cardId={card.id}
                      boardMonth={boardMonth}
                      boardYear={boardYear}
                      dragDisabled={sortKey !== null}
                      showInsertionLine={insertionTargetBillId === bill.id}
                      insertionLineAfter={insertionLineAfter}
                      onTogglePaid={() => onBillToggle(card.id, bill.id)}
                      onPaidPendingChange={pending => setBillPaidPending(bill.id, pending)}
                      onUpdate={changes => onBillUpdate(card.id, bill.id, changes)}
                      onRemove={() => onBillRemove(card.id, bill.id)}
                      onMute={() => onBillUpdate(card.id, bill.id, { muted: !bill.muted })}
                      onSaveToMaster={() => saveBillToMaster(bill)}
                      onColorChange={hex =>
                        onBillUpdate(card.id, bill.id, {
                          rowColor: hex,
                        })
                      }
                    />
                  ))}
                  {insertionAtEnd && (
                    <div className="relative py-2" aria-hidden>
                      <div className="mx-1 h-0.5 rounded-full bg-[#185FA5]" />
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>

            <div className="live-unpaid-composer">
              <button
                type="button"
                onClick={() => {
                  if (addOpen) {
                    setAddOpen(false)
                    return
                  }
                  setAddOpen(true)
                }}
                aria-expanded={addOpen}
                className={cn(
                  'add-bill-row group flex w-full shrink-0 items-center gap-2 py-2 text-[13px] font-normal text-(--text-tertiary)',
                  addOpen ? 'text-(--text-secondary)' : 'hover:text-(--text-secondary)'
                )}
              >
                <Plus
                  className={cn(
                    'size-3.5 shrink-0 opacity-70 transition-[transform,opacity,color] duration-150 ease-out group-hover:opacity-100',
                    addOpen && 'rotate-45'
                  )}
                  aria-hidden
                />
                <span>{addOpen ? 'Cancel' : 'Add bill'}</span>
              </button>

              <AddBillInline
                open={addOpen}
                boardMonth={boardMonth}
                boardYear={boardYear}
                creditors={pickerCreditors}
                expenseCategories={expenseCategories}
                onCancel={() => setAddOpen(false)}
                onAdd={bill => {
                  onBillAdd(card.id, bill)
                  setAddOpen(false)
                }}
              />
            </div>
          </div>
        )}

        {boardMode === 'live' && activeTab === 'paid' && (
          <div className="module-tab-overlay">
            {paidBills.length === 0 ? (
              <>
                <div className="module-tab-content-zone is-empty">
                  <p className="module-tab-empty">No paid bills yet.</p>
                </div>
                <div className="module-tab-composer-spacer" aria-hidden />
              </>
            ) : (
              <div className="flex flex-1 flex-col">
                <ModuleBillTableHeader
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                />
                <div className="module-tab-content-zone scrollbar-thin flex-1 overflow-y-auto pb-3">
                  <div className="bill-list">
                    {sortedPaidBills.map(bill => (
                      <BillRow
                        key={bill.id}
                        bill={bill}
                        cardId={card.id}
                        boardMonth={boardMonth}
                        boardYear={boardYear}
                        onTogglePaid={() => onBillToggle(card.id, bill.id)}
                        onPaidPendingChange={pending => setBillPaidPending(bill.id, pending)}
                        onUpdate={changes => onBillUpdate(card.id, bill.id, changes)}
                        onRemove={() => onBillRemove(card.id, bill.id)}
                        onMute={() => onBillUpdate(card.id, bill.id, { muted: !bill.muted })}
                        onSaveToMaster={() => saveBillToMaster(bill)}
                        onColorChange={hex =>
                          onBillUpdate(card.id, bill.id, {
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

        {boardMode === 'live' && activeTab === 'notes' && (
          <div className="live-notes-panel">
            <NotesPanel
              layout="flow"
              notes={card.notes}
              currentUserId={currentUserId}
              onNoteDelete={noteId => onNoteDelete(card.id, noteId)}
              onNotePost={postNote}
            />
          </div>
        )}
      </div>

      {boardMode === 'template' && (
        <>
          <button
            type="button"
            onClick={() => {
              if (addOpen) {
                setAddOpen(false)
                return
              }
              setAddOpen(true)
            }}
            aria-expanded={addOpen}
            className={cn(
              'add-bill-row group flex w-full items-center gap-2 px-5 py-2 text-[13px] font-normal text-(--text-tertiary)',
              addOpen ? 'text-(--text-secondary)' : 'hover:text-(--text-secondary)'
            )}
          >
            <Plus
              className={cn(
                'size-3.5 shrink-0 opacity-70 transition-[transform,opacity,color] duration-150 ease-out group-hover:opacity-100',
                addOpen && 'rotate-45'
              )}
              aria-hidden
            />
            <span>{addOpen ? 'Cancel' : 'Add bill'}</span>
          </button>

          <AddBillInline
            open={addOpen}
            boardMonth={boardMonth}
            boardYear={boardYear}
            creditors={pickerCreditors}
            expenseCategories={expenseCategories}
            onCancel={() => setAddOpen(false)}
            onAdd={bill => {
              onBillAdd(card.id, bill)
              setAddOpen(false)
            }}
          />
        </>
      )}

      <ModuleFooter
        totalExpenses={totalExpenses}
        remaining={remaining}
        mutedCount={mutedCount}
        mutedTotal={mutedTotal}
      />
    </div>
  )
}
