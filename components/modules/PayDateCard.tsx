'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BoardMode } from '@/lib/board-workspace-types'
import type { Bill, Creditor, Note, PayDateCard, User } from '@/lib/types'
import { filterMasterListPickerCreditors } from '@/lib/creditors'
import { ASAP_DUE_DATE, formatDueDateDisplay, isAsapDueDate } from '@/lib/due-date'
import { generateId } from '@/lib/format'
import { getModuleFooterStats } from '@/lib/module-totals'
import { useUserPrefs } from '@/lib/userPrefs'
import { cn } from '@/lib/utils'
import { AddBillSection } from './AddBillSection'
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
  /** True when this card is where the actively-dragged bill currently lives — same-card
   *  reordering already shows feedback via the row's own drag transform, so the live
   *  insertion spacer is skipped here to avoid the two effects fighting each other. */
  isActiveBillOriginCard?: boolean
  /** ID of the bill currently being dragged from this card. Used to detect when a bill
   *  has left so a collapsing spacer can hold the list height during the transition. */
  draggingBillId?: string | null
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
  isActiveBillOriginCard,
  draggingBillId,
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
  const [headerColorPreview, setHeaderColorPreview] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [enteringBillId, setEnteringBillId] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const minHeightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enteringBillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevDraggingBillIdRef = useRef<string | null>(null)
  const leavingSpacerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showLeavingSpacer, setShowLeavingSpacer] = useState(false)
  const { prefs, patch } = useUserPrefs()

  const [sortKey, setSortKey] = useState<BillSortKey | null>(
    () => prefs.moduleSortState?.[card.id]?.key ?? null
  )
  const [sortDirection, setSortDirection] = useState<BillSortDirection>(
    () => prefs.moduleSortState?.[card.id]?.direction ?? 'asc'
  )

  const ownerName = users.find(u => u.id === card.owner)?.name ?? 'Unknown'

  const { remaining, totalExpenses, mutedCount, mutedTotal, unreadCount } = useMemo(
    () => getModuleFooterStats(card, currentUserId, prefs.readNoteIds),
    [card, currentUserId, prefs.readNoteIds]
  )

  const prevRemainingRef = useRef(remaining)
  useEffect(() => {
    prevRemainingRef.current = remaining
  }, [remaining])

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
        headerColor: headerColorPreview ?? effectiveHeaderColor,
        ownerId: card.owner,
        highlightDrop: highlightBillDrop,
      }),
    [highlightBillDrop, headerColorPreview, effectiveHeaderColor, card.owner]
  )

  const setBillPaidPending = useCallback((billId: string, pending: boolean) => {
    setPendingPaidBillIds(prev => {
      const next = new Set(prev)
      if (pending) next.add(billId)
      else next.delete(billId)
      return next
    })
  }, [])

  const handleSetAddOpen = useCallback((open: boolean) => {
    if (minHeightTimerRef.current !== null) {
      clearTimeout(minHeightTimerRef.current)
      minHeightTimerRef.current = null
    }
    if (open) {
      if (bodyRef.current) {
        bodyRef.current.style.minHeight = `${bodyRef.current.offsetHeight}px`
      }
    } else {
      minHeightTimerRef.current = setTimeout(() => {
        if (bodyRef.current) bodyRef.current.style.minHeight = ''
        minHeightTimerRef.current = null
      }, 210)
    }
    setAddOpen(open)
  }, [])

  const markBillEntering = useCallback((billId: string) => {
    if (enteringBillTimerRef.current !== null) clearTimeout(enteringBillTimerRef.current)
    setEnteringBillId(billId)
    enteringBillTimerRef.current = setTimeout(() => {
      setEnteringBillId(null)
      enteringBillTimerRef.current = null
    }, 210)
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

  // Where an incoming dragged bill would land in the live unpaid list — used to
  // reserve a row-sized gap while hovering, so the list never feels cramped/scrolly.
  const liveInsertionIndex = useMemo(() => {
    if (isActiveBillOriginCard) return null
    if (insertionAtEnd) return displayedBills.length
    if (!insertionTargetBillId) return null
    const idx = displayedBills.findIndex(b => b.id === insertionTargetBillId)
    if (idx === -1) return null
    return insertionLineAfter ? idx + 1 : idx
  }, [isActiveBillOriginCard, insertionAtEnd, insertionTargetBillId, insertionLineAfter, displayedBills])

  useEffect(() => {
    if (activeTab === 'notes') {
      onNotesRead(card.id)
    }
  }, [activeTab, card.id, onNotesRead])

  // When a bill finishes being dragged away from this card, show a collapsing spacer
  // that holds the list height briefly so it never snaps down and triggers a scrollbar.
  useEffect(() => {
    const prev = prevDraggingBillIdRef.current
    prevDraggingBillIdRef.current = draggingBillId ?? null

    if (prev && !draggingBillId) {
      const billStillHere = card.bills.some(b => b.id === prev)
      if (!billStillHere) {
        if (leavingSpacerTimerRef.current !== null) clearTimeout(leavingSpacerTimerRef.current)
        setShowLeavingSpacer(true)
        leavingSpacerTimerRef.current = setTimeout(() => {
          setShowLeavingSpacer(false)
          leavingSpacerTimerRef.current = null
        }, 260)
      }
    }
  }, [draggingBillId, card.bills])

  const handleTabChange = useCallback(
    (tab: ModuleTabId) => {
      if (boardMode === 'live' && tab !== 'unpaid') {
        handleSetAddOpen(false)
      }
      setActiveTab(tab)
    },
    [boardMode, handleSetAddOpen]
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
    }
    onNoteAdd(card.id, note)
  }

  function toggleSort(nextKey: BillSortKey) {
    const nextDirection: BillSortDirection =
      sortKey === nextKey
        ? sortDirection === 'asc' ? 'desc' : 'asc'
        : nextKey === 'amount' ? 'desc' : 'asc'
    setSortKey(nextKey)
    setSortDirection(nextDirection)
    patch(current => ({
      moduleSortState: {
        ...(current.moduleSortState ?? {}),
        [card.id]: { key: nextKey, direction: nextDirection },
      },
    }))
  }

  const clearSort = useCallback(() => {
    setSortKey(null)
    patch(current => {
      const next = { ...(current.moduleSortState ?? {}) }
      delete next[card.id]
      return { moduleSortState: next }
    })
  }, [card.id, patch])

  const saveBillToMaster = useCallback(
    (bill: Bill) => {
      if (bill.promotedToMaster) return

      const now = new Date().toISOString()
      const dueDay = readBillDueDay(bill.dueDate, boardMonth)
      const creditor: Creditor = {
        id: generateId('creditor'),
        name: bill.name.trim() || 'Custom bill',
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
        'module-card relative overflow-visible transition-[box-shadow,border-color,min-height] duration-150 ease-out',
        'flex flex-col',
        boardMode === 'template'
          ? 'template-module-card min-h-0'
          : 'live-module-card min-h-[26rem]',
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
        onHeaderColorDraftChange={color => setHeaderColorPreview(color)}
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
        cardId={card.id}
      />

      <div
        ref={bodyRef}
        className={cn(
          'relative flex flex-col bg-(--bg-primary) transition-[background-color] duration-150 ease-out',
          boardMode === 'live'
            ? 'live-module-body flex min-h-0 flex-1 flex-col'
            : 'min-h-0 flex-none',
          highlightBillDrop && 'bg-[color-mix(in_srgb,var(--bg-primary)_85%,transparent)]'
        )}
      >
        {boardMode === 'template' ? (
          <div className="flex flex-col">
            <ModuleBillTableHeader
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={toggleSort}
              omitCheckColumn
            />

            <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
              <div className="bill-list scrollbar-thin scrollbar-gutter-stable relative max-h-[min(52vh,420px)] overflow-x-hidden overflow-y-auto pb-2">
                {displayedBills.map(bill => {
                  const archivedInMaster = isBillArchivedInMasterList(bill, creditors)
                  return (
                    <SortableBillRow
                      key={bill.id}
                      bill={bill}
                      cardId={card.id}
                      boardMonth={boardMonth}
                      boardYear={boardYear}
                      onDragStart={clearSort}
                      omitCheckColumn
                      dueDateDayOnly
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
          <div
            role="tabpanel"
            id={`${card.id}-tabpanel-unpaid`}
            aria-labelledby={`${card.id}-tab-unpaid`}
            className="live-bills-panel"
          >
            <div className="live-bills-scroll">
              <ModuleBillTableHeader
                sortKey={sortKey}
                sortDirection={sortDirection}
                onToggleSort={toggleSort}
              />

              <SortableContext items={displayedIds} strategy={verticalListSortingStrategy}>
                <div className="bill-list relative pb-2">
                  {displayedBills.map((bill, index) => (
                    <Fragment key={bill.id}>
                      {liveInsertionIndex === index && (
                        <div className="bill-insertion-spacer" aria-hidden>
                          <div className="bill-insertion-spacer__inner" />
                        </div>
                      )}
                      {/* On mobile, paid bills are hidden from the unpaid tab — visible in the Paid tab instead */}
                      <div className={cn(bill.paid && 'xl:block hidden')}>
                        <SortableBillRow
                          bill={bill}
                          cardId={card.id}
                          boardMonth={boardMonth}
                          boardYear={boardYear}
                          onDragStart={clearSort}
                          entering={bill.id === enteringBillId}
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
                      </div>
                    </Fragment>
                  ))}
                  {liveInsertionIndex === displayedBills.length && (
                    <div className="bill-insertion-spacer" aria-hidden>
                      <div className="bill-insertion-spacer__inner" />
                    </div>
                  )}
                  {showLeavingSpacer && (
                    <div className="bill-leaving-spacer" aria-hidden />
                  )}
                </div>
              </SortableContext>
            </div>
          </div>
        )}

        {boardMode === 'live' && activeTab === 'paid' && (
          <div
            role="tabpanel"
            id={`${card.id}-tabpanel-paid`}
            aria-labelledby={`${card.id}-tab-paid`}
            className="live-bills-panel paid-tab-panel"
          >
            {paidBills.length === 0 ? (
              <div className="module-tab-content-zone is-empty flex-1">
                <p className="module-tab-empty">No paid bills yet.</p>
              </div>
            ) : (
              <div className="live-bills-scroll">
                <ModuleBillTableHeader
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                />
                <div className="bill-list relative pb-2">
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
            )}
          </div>
        )}

        {boardMode === 'live' && activeTab === 'notes' && (
          <div
            role="tabpanel"
            id={`${card.id}-tabpanel-notes`}
            aria-labelledby={`${card.id}-tab-notes`}
            className="live-notes-panel"
          >
            <NotesPanel
              layout="flow"
              notes={card.notes}
              currentUserId={currentUserId}
              readNoteIds={prefs.readNoteIds}
              onNoteDelete={noteId => onNoteDelete(card.id, noteId)}
              onNotePost={postNote}
            />
          </div>
        )}
      </div>

      {((boardMode === 'live' && activeTab === 'unpaid') || boardMode === 'template') && (
        <AddBillSection
          open={addOpen}
          onOpenChange={handleSetAddOpen}
          boardMonth={boardMonth}
          boardYear={boardYear}
          creditors={pickerCreditors}
          expenseCategories={expenseCategories}
          dueDateDayOnly={boardMode === 'template'}
          onAdd={bill => {
            onBillAdd(card.id, bill)
            handleSetAddOpen(false)
            if (boardMode === 'live') markBillEntering(bill.id)
          }}
        />
      )}

      <ModuleFooter
        totalExpenses={totalExpenses}
        remaining={remaining}
        mutedCount={mutedCount}
        mutedTotal={mutedTotal}
        prevRemaining={prevRemainingRef.current}
      />
    </div>
  )
}
