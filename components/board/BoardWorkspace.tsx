'use client'



import {

  DndContext,

  DragEndEvent,

  DragMoveEvent,

  DragOverlay,

  DragStartEvent,

  KeyboardSensor,

  MouseSensor,

  closestCorners,

  useSensor,

  useSensors,

} from '@dnd-kit/core'

import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { BillRow } from '@/components/modules/BillRow'

import { PayDateCard } from '@/components/modules/PayDateCard'

import type { ModuleActions } from '@/components/modules/module-actions'

import type { BoardMode } from '@/lib/board-workspace-types'

import type { Creditor, PayDateCard as PayDateCardModel, User } from '@/lib/types'

import { payDateSortTime } from '@/lib/pay-date'

import { cn } from '@/lib/utils'

import { moduleColorKey, useUserPrefs } from '@/lib/userPrefs'

import { AddPayDateCardSlot } from './AddPayDateCardSlot'



export type { BoardMode } from '@/lib/board-workspace-types'



function reorderBills(card: PayDateCardModel, activeId: string, overId: string) {

  const ids = card.bills.map(b => b.id)

  const oldIndex = ids.indexOf(activeId)

  const newIndex = ids.indexOf(overId)

  if (oldIndex < 0 || newIndex < 0 || activeId === overId) return card.bills

  const nextIds = arrayMove(ids, oldIndex, newIndex)

  const map = new Map(card.bills.map(b => [b.id, b]))

  return nextIds.map(id => map.get(id)!)

}

/** Whether the dragged bill's current rect sits below the hovered row's midpoint — i.e. "insert after" rather than "insert before". */
function isPastMidpoint(
  activeRect: { top: number; height: number } | null | undefined,
  overRect: { top: number; height: number } | null | undefined
): boolean {
  if (!activeRect || !overRect) return false
  return activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
}

/** Cross-card move target: insertUnpaidBill only knows "insert before X" or "append to end" (beforeBillId undefined). */
function resolveBeforeBillId(
  toCard: PayDateCardModel,
  overBillId: string,
  insertAfter: boolean
): string | undefined {
  if (!insertAfter) return overBillId
  const unpaid = toCard.bills.filter(b => !b.paid)
  const idx = unpaid.findIndex(b => b.id === overBillId)
  if (idx === -1) return overBillId
  return unpaid[idx + 1]?.id
}



export type BoardWorkspaceProps = {

  boardId: string

  payDateCards: PayDateCardModel[]

  month: number

  year: number

  boardMode: BoardMode

  users: User[]

  incomeSources: string[]

  creditors: Creditor[]

  expenseCategories: string[]

  onCategoryCreate?: (category: string) => void

  currentUserId: string

  moduleActions: ModuleActions

  isLoading?: boolean

  emptyMessage?: string

  showAddPayDateCard?: boolean

  onAddPayDateCard?: () => void

  /** Custom add-card slot (template inline form). Overrides built-in add slot when set. */

  payDateCardAddSlot?: ReactNode

  boardMaxWidthClass?: string

}

export function BoardWorkspace({

  boardId,

  payDateCards,

  month,

  year,

  boardMode,

  users,

  incomeSources,

  creditors,

  expenseCategories,

  onCategoryCreate,

  currentUserId,

  moduleActions,

  isLoading = false,

  emptyMessage = 'No pay date cards yet.',

  showAddPayDateCard = false,

  onAddPayDateCard,

  payDateCardAddSlot,

  boardMaxWidthClass = 'max-w-[1560px]',

}: BoardWorkspaceProps) {

  const { prefs } = useUserPrefs()

  const headerColorOverrides = prefs.moduleHeaderColors



  const [billOverCardId, setBillOverCardId] = useState<string | null>(null)

  const [billOverBillId, setBillOverBillId] = useState<string | null>(null)

  const [billOverZoneOnly, setBillOverZoneOnly] = useState(false)

  const [billInsertionAfter, setBillInsertionAfter] = useState(false)

  const [draggingBill, setDraggingBill] = useState(false)

  const [activeBillId, setActiveBillId] = useState<string | null>(null)

  const [activeBillFromCardId, setActiveBillFromCardId] = useState<string | null>(null)

  const [activeBillWidth, setActiveBillWidth] = useState<number | null>(null)

  const cardWrapperRefs = useRef(new Map<string, HTMLDivElement>())
  const cardHeightLockTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // When a bill leaves a card (moved to another card), the card's natural height
  // shrinks instantly — left uncontrolled, that one-frame snap is what was causing
  // the source card's bill list to flash a scrollbar. Lock the card's height at its
  // pre-removal size first, then release the lock on a later, calm frame so the
  // shrink never has to fight with the bill's own removal in the same paint.
  const lockCardHeight = useCallback((cardId: string) => {
    const wrapper = cardWrapperRefs.current.get(cardId)
    const cardEl = wrapper?.querySelector<HTMLElement>('.module-card')
    if (!cardEl) return

    const existingTimer = cardHeightLockTimers.current.get(cardId)
    if (existingTimer !== undefined) clearTimeout(existingTimer)

    cardEl.style.minHeight = `${cardEl.getBoundingClientRect().height}px`
    const timer = setTimeout(() => {
      cardEl.style.minHeight = ''
      cardHeightLockTimers.current.delete(cardId)
    }, 220)
    cardHeightLockTimers.current.set(cardId, timer)
  }, [])

  const sensors = useSensors(

    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),

    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })

  )



  const sortedPayDateCards = useMemo(
    () =>
      [...payDateCards].sort(
        (a, z) => payDateSortTime(a.payDate, a.sortOrder) - payDateSortTime(z.payDate, z.sortOrder)
      ),
    [payDateCards]
  )



  const handleDragStart = useCallback((event: DragStartEvent) => {

    if (event.active.data.current?.type === 'bill') {

      setDraggingBill(true)

      setActiveBillId(event.active.id as string)

      setActiveBillFromCardId(event.active.data.current.cardId as string)

      setActiveBillWidth(event.active.rect.current.initial?.width ?? null)

    }

  }, [])



  const handleDragMove = useCallback(

    (event: DragMoveEvent) => {

      const { active, over } = event

      if (!over || active.data.current?.type !== 'bill') {

        setBillOverCardId(null)

        setBillOverBillId(null)

        setBillOverZoneOnly(false)

        setBillInsertionAfter(false)

        return

      }

      const od = over.data.current as { type?: string; cardId?: string } | undefined

      let modId: string | undefined

      if (od?.type === 'bill-zone') {

        modId = od.cardId

        setBillOverBillId(null)

        setBillOverZoneOnly(true)

        setBillInsertionAfter(false)

      } else if (od?.type === 'bill') {

        modId = od.cardId

        setBillOverBillId(over.id as string)

        setBillOverZoneOnly(false)

        setBillInsertionAfter(isPastMidpoint(active.rect.current.translated, over.rect))

      }

      setBillOverCardId(modId ?? null)

    },

    []

  )



  const handleDragEnd = useCallback(

    (event: DragEndEvent) => {

      setBillOverCardId(null)

      setBillOverBillId(null)

      setBillOverZoneOnly(false)

      setBillInsertionAfter(false)

      setDraggingBill(false)

      setActiveBillId(null)

      setActiveBillFromCardId(null)

      setActiveBillWidth(null)

      const { active, over } = event

      if (!over) return



      if (active.data.current?.type !== 'bill') return



      const billId = active.id as string

      const fromCardId = active.data.current.cardId as string



      const od = over.data.current as { type?: string; cardId?: string } | undefined

      let toCardId = fromCardId

      let beforeBillId: string | undefined



      if (od?.type === 'bill-zone') {

        toCardId = od.cardId as string

      } else if (od?.type === 'bill') {

        toCardId = od.cardId as string

        beforeBillId = over.id as string

      }



      const fromCard = payDateCards.find(m => m.id === fromCardId)

      if (!fromCard) return



      if (fromCardId === toCardId) {

        if (od?.type === 'bill' && billId !== over.id) {

          const next = reorderBills(fromCard, billId, over.id as string)

          moduleActions.onUpdate(fromCardId, { bills: next })

        }

        return

      }



      if (od?.type === 'bill') {

        const toCard = payDateCards.find(m => m.id === toCardId)

        const insertAfter = isPastMidpoint(active.rect.current.translated, over.rect)

        beforeBillId = toCard ? resolveBeforeBillId(toCard, over.id as string, insertAfter) : beforeBillId

      }



      lockCardHeight(fromCardId)

      moduleActions.onBillMove(fromCardId, toCardId, billId, beforeBillId)

    },

    [moduleActions, payDateCards, lockCardHeight]

  )



  const handleDragCancel = useCallback(() => {

    setBillOverCardId(null)

    setBillOverBillId(null)

    setBillOverZoneOnly(false)

    setBillInsertionAfter(false)

    setDraggingBill(false)

    setActiveBillId(null)

    setActiveBillFromCardId(null)

    setActiveBillWidth(null)

  }, [])

  const activeBill = useMemo(
    () =>
      activeBillId
        ? payDateCards.flatMap(c => c.bills).find(b => b.id === activeBillId) ?? null
        : null,
    [activeBillId, payDateCards]
  )

  if (isLoading) {

    return (

      <div className="rounded-lg border border-border bg-(--bg-secondary) p-8 text-center text-(--text-secondary)">

        Loading boards…

      </div>

    )

  }



  function renderPayDateCard(m: PayDateCardModel) {

    return (

      <PayDateCard

        key={m.id}

        card={m}

        boardId={boardId}

        boardMonth={month}

        boardYear={year}

        boardMode={boardMode}

        allCards={payDateCards}

        creditors={creditors}

        currentUserId={currentUserId}

        users={users}

        incomeSources={incomeSources}

        expenseCategories={expenseCategories}

        onCategoryCreate={onCategoryCreate}

        headerColorOverride={headerColorOverrides[moduleColorKey(m)]}

        actions={moduleActions}

        highlightBillDrop={draggingBill && billOverCardId === m.id}

        insertionTargetBillId={billOverCardId === m.id ? billOverBillId : null}

        insertionLineAfter={billOverCardId === m.id ? billInsertionAfter : false}

        insertionAtEnd={billOverCardId === m.id && billOverZoneOnly}

        isActiveBillOriginCard={activeBillFromCardId === m.id}

        draggingBillId={activeBillFromCardId === m.id ? activeBillId : null}

      />

    )

  }



  const addSlot = payDateCardAddSlot

    ? payDateCardAddSlot

    : showAddPayDateCard && onAddPayDateCard ? (

        <AddPayDateCardSlot onClick={onAddPayDateCard} />

      ) : null



  const addSlotInGrid = Boolean(addSlot)



  return (

    <DndContext

      sensors={sensors}

      collisionDetection={closestCorners}

      autoScroll={false}

      onDragStart={handleDragStart}

      onDragMove={handleDragMove}

      onDragEnd={handleDragEnd}

      onDragCancel={handleDragCancel}

    >

      <div className={cn('mx-auto w-full', boardMaxWidthClass)}>

        {payDateCards.length === 0 && !addSlot ? (

          <p className="rounded-lg border border-dashed border-border bg-(--bg-primary) px-6 py-12 text-center text-[13px] text-(--text-tertiary)">

            {emptyMessage}

          </p>

        ) : (

          <div
            className={cn(
              'grid grid-cols-1 xl:grid-cols-2 items-start',
              boardMode === 'template' ? 'gap-6 xl:gap-8' : 'gap-8 xl:gap-10'
            )}
          >
            {sortedPayDateCards.map((m) => (
              <div
                key={m.id}
                ref={el => {
                  if (el) cardWrapperRefs.current.set(m.id, el)
                  else cardWrapperRefs.current.delete(m.id)
                }}
                className={cn(
                  'min-w-0 w-full self-start',
                  boardMode === 'template' && 'template-board-module-slot'
                )}
              >
                {renderPayDateCard(m)}
              </div>
            ))}

            {addSlotInGrid && addSlot ? (
              <div className="flex min-h-0 min-w-0 items-center justify-center self-stretch p-1">
                {addSlot}
              </div>
            ) : null}
          </div>

        )}

      </div>

      <DragOverlay dropAnimation={null}>

        {activeBill ? (

          <div
            className="bill-drag-preview rounded-lg border border-(--border-strong) bg-(--bg-primary) shadow-lg"
            style={activeBillWidth ? { width: activeBillWidth } : undefined}
          >

            <BillRow
              bill={activeBill}
              cardId={activeBillFromCardId ?? ''}
              boardMonth={month}
              boardYear={year}
              isDragging
              onTogglePaid={() => {}}
              onUpdate={() => {}}
              onRemove={() => {}}
              onMute={() => {}}
              onSaveToMaster={() => {}}
              onColorChange={() => {}}
            />

          </div>

        ) : null}

      </DragOverlay>

    </DndContext>

  )

}

