'use client'



import {

  DndContext,

  DragEndEvent,

  DragOverEvent,

  DragStartEvent,

  KeyboardSensor,

  PointerSensor,

  closestCorners,

  useSensor,

  useSensors,

} from '@dnd-kit/core'

import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { useCallback, useMemo, useState, type ReactNode } from 'react'

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



  const sensors = useSensors(

    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),

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

    }

  }, [])



  const handleDragOver = useCallback(

    (event: DragOverEvent) => {

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



        const activeId = active.id as string

        const overId = over.id as string

        const fromCardId = active.data.current?.cardId as string

        const sourceCard = payDateCards.find(m => m.id === fromCardId)

        if (sourceCard && activeId !== overId) {

          const oldIndex = sourceCard.bills.findIndex(b => b.id === activeId)

          const overIndex = sourceCard.bills.findIndex(b => b.id === overId)

          setBillInsertionAfter(oldIndex >= 0 && overIndex >= 0 && oldIndex < overIndex)

        } else {

          setBillInsertionAfter(false)

        }

      }

      setBillOverCardId(modId ?? null)

    },

    [payDateCards]

  )



  const handleDragEnd = useCallback(

    (event: DragEndEvent) => {

      setBillOverCardId(null)

      setBillOverBillId(null)

      setBillOverZoneOnly(false)

      setBillInsertionAfter(false)

      setDraggingBill(false)

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



      moduleActions.onBillMove(fromCardId, toCardId, billId, beforeBillId)

    },

    [moduleActions, payDateCards]

  )



  const handleDragCancel = useCallback(() => {

    setBillOverCardId(null)

    setBillOverBillId(null)

    setBillOverZoneOnly(false)

    setBillInsertionAfter(false)

    setDraggingBill(false)

  }, [])



  if (isLoading) {

    return (

      <div className="rounded-xl border border-border bg-(--bg-secondary) p-8 text-center text-(--text-secondary)">

        Loading board…

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

        headerColorOverride={headerColorOverrides[moduleColorKey(m)]}

        actions={moduleActions}

        highlightBillDrop={draggingBill && billOverCardId === m.id}

        insertionTargetBillId={billOverCardId === m.id ? billOverBillId : null}

        insertionLineAfter={billOverCardId === m.id ? billInsertionAfter : false}

        insertionAtEnd={billOverCardId === m.id && billOverZoneOnly}

      />

    )

  }



  const addSlot = payDateCardAddSlot

    ? payDateCardAddSlot

    : showAddPayDateCard && onAddPayDateCard ? (

        <AddPayDateCardSlot onClick={onAddPayDateCard} />

      ) : null



  const addSlotInGrid = Boolean(addSlot)

  const addGridColumn = sortedPayDateCards.length % 2 === 0 ? 1 : 2

  const addGridRow = Math.floor(sortedPayDateCards.length / 2) + 1



  return (

    <DndContext

      sensors={sensors}

      collisionDetection={closestCorners}

      onDragStart={handleDragStart}

      onDragOver={handleDragOver}

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
              'grid grid-cols-2 items-start',
              boardMode === 'template' ? 'gap-6 xl:gap-8' : 'gap-8 xl:gap-10'
            )}
          >
            {sortedPayDateCards.map((m, index) => (
              <div
                key={m.id}
                className={cn(
                  'min-w-0 w-full self-start',
                  boardMode === 'template' && 'template-board-module-slot'
                )}
                style={{
                  gridColumn: (index % 2) + 1,
                  gridRow: Math.floor(index / 2) + 1,
                }}
              >
                {renderPayDateCard(m)}
              </div>
            ))}

            {addSlotInGrid && addSlot ? (
              <div
                className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center self-stretch p-1"
                style={{
                  gridColumn: addGridColumn,
                  gridRow: addGridRow,
                }}
              >
                <div className="flex w-full justify-center">{addSlot}</div>
              </div>
            ) : null}
          </div>

        )}

      </div>

    </DndContext>

  )

}

