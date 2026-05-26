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
import { PayDateModule } from '@/components/modules/PayDateModule'
import type { PayDateModule as PayDateModuleModel } from '@/lib/types'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

function reorderBills(module: PayDateModuleModel, activeId: string, overId: string) {
  const ids = module.bills.map(b => b.id)
  const oldIndex = ids.indexOf(activeId)
  const newIndex = ids.indexOf(overId)
  if (oldIndex < 0 || newIndex < 0 || activeId === overId) return module.bills
  const nextIds = arrayMove(ids, oldIndex, newIndex)
  const map = new Map(module.bills.map(b => [b.id, b]))
  return nextIds.map(id => map.get(id)!)
}

function ColumnRail({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[280px] flex-1 flex-col gap-6 rounded-lg p-1">
      {children}
    </div>
  )
}

export function MonthlyBoard() {
  const {
    data,
    isLoaded,
    getActiveBoard,
    updateModule,
    toggleBillPaid,
    moveBill,
    addBill,
    updateBill,
    removeBill,
    addNote,
    deleteNote,
    markNotesRead,
    removeModule,
    duplicateModule,
    addCreditor,
  } = useMyPayBoard()

  const board = getActiveBoard()
  const boardId = board?.id

  const [billOverModuleId, setBillOverModuleId] = useState<string | null>(null)
  const [billOverBillId, setBillOverBillId] = useState<string | null>(null)
  const [billOverZoneOnly, setBillOverZoneOnly] = useState(false)
  const [billInsertionAfter, setBillInsertionAfter] = useState(false)
  const [draggingBill, setDraggingBill] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const col1Modules = useMemo(
    () => (!board ? [] : board.modules.filter(m => (m.boardColumn ?? 1) === 1)),
    [board]
  )

  const col2Modules = useMemo(
    () => (!board ? [] : board.modules.filter(m => (m.boardColumn ?? 1) === 2)),
    [board]
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
        setBillOverModuleId(null)
        setBillOverBillId(null)
        setBillOverZoneOnly(false)
        setBillInsertionAfter(false)
        return
      }
      const od = over.data.current as { type?: string; moduleId?: string } | undefined
      let modId: string | undefined
      if (od?.type === 'bill-zone') {
        modId = od.moduleId
        setBillOverBillId(null)
        setBillOverZoneOnly(true)
        setBillInsertionAfter(false)
      } else if (od?.type === 'bill') {
        modId = od.moduleId
        setBillOverBillId(over.id as string)
        setBillOverZoneOnly(false)

        const activeId = active.id as string
        const overId = over.id as string
        const fromModuleId = active.data.current?.moduleId as string
        const sourceModule = board?.modules.find(m => m.id === fromModuleId)
        if (sourceModule && activeId !== overId) {
          const oldIndex = sourceModule.bills.findIndex(b => b.id === activeId)
          const overIndex = sourceModule.bills.findIndex(b => b.id === overId)
          setBillInsertionAfter(oldIndex >= 0 && overIndex >= 0 && oldIndex < overIndex)
        } else {
          setBillInsertionAfter(false)
        }
      }
      setBillOverModuleId(modId ?? null)
    },
    [board]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setBillOverModuleId(null)
      setBillOverBillId(null)
      setBillOverZoneOnly(false)
      setBillInsertionAfter(false)
      setDraggingBill(false)
      const { active, over } = event
      if (!board || !over) return

      if (active.data.current?.type !== 'bill') return

      const billId = active.id as string
      const fromModuleId = active.data.current.moduleId as string

      const od = over.data.current as { type?: string; moduleId?: string } | undefined
      let toModuleId = fromModuleId
      let beforeBillId: string | undefined

      if (od?.type === 'bill-zone') {
        toModuleId = od.moduleId as string
      } else if (od?.type === 'bill') {
        toModuleId = od.moduleId as string
        beforeBillId = over.id as string
      }

      const fromModule = board.modules.find(m => m.id === fromModuleId)
      if (!fromModule) return

      if (fromModuleId === toModuleId) {
        if (od?.type === 'bill' && billId !== over.id) {
          const next = reorderBills(fromModule, billId, over.id as string)
          updateModule(board.id, fromModuleId, { bills: next })
        }
        return
      }

      moveBill(board.id, fromModuleId, toModuleId, billId, beforeBillId)
    },
    [board, moveBill, updateModule]
  )

  const handleDragCancel = useCallback(() => {
    setBillOverModuleId(null)
    setBillOverBillId(null)
    setBillOverZoneOnly(false)
    setBillInsertionAfter(false)
    setDraggingBill(false)
  }, [])

  const handleNotesRead = useCallback(
    (moduleId: string) => {
      if (!boardId) return
      markNotesRead(boardId, moduleId, data.currentUserId)
    },
    [boardId, data.currentUserId, markNotesRead]
  )

  if (!isLoaded || !board) {
    return (
      <div className="rounded-xl border border-border bg-(--bg-secondary) p-8 text-center text-(--text-secondary)">
        {!isLoaded ? 'Loading board…' : 'No active monthly board yet.'}
      </div>
    )
  }

  const activeBoard = board

  function renderModule(m: PayDateModuleModel) {
    return (
      <PayDateModule
        key={m.id}
        module={m}
        boardId={activeBoard.id}
        boardMonth={activeBoard.month}
        boardYear={activeBoard.year}
        allModules={activeBoard.modules}
        creditors={data.creditors}
        currentUserId={data.currentUserId}
        users={data.users}
        expenseCategories={data.expenseCategories}
        highlightBillDrop={draggingBill && billOverModuleId === m.id}
        insertionTargetBillId={billOverModuleId === m.id ? billOverBillId : null}
        insertionLineAfter={billOverModuleId === m.id ? billInsertionAfter : false}
        insertionAtEnd={billOverModuleId === m.id && billOverZoneOnly}
        onUpdate={(moduleId, changes) => updateModule(activeBoard.id, moduleId, changes)}
        onBillToggle={(moduleId, billId) => toggleBillPaid(activeBoard.id, moduleId, billId)}
        onBillMove={(fromModuleId, toModuleId, billId, beforeBillId) =>
          moveBill(activeBoard.id, fromModuleId, toModuleId, billId, beforeBillId)
        }
        onBillAdd={(moduleId, bill) => addBill(activeBoard.id, moduleId, bill)}
        onCreditorAdd={addCreditor}
        onBillUpdate={(moduleId, billId, changes) => updateBill(activeBoard.id, moduleId, billId, changes)}
        onBillRemove={(moduleId, billId) => removeBill(activeBoard.id, moduleId, billId)}
        onNoteAdd={(moduleId, note) => addNote(activeBoard.id, moduleId, note)}
        onNoteDelete={(moduleId, noteId) => deleteNote(activeBoard.id, moduleId, noteId)}
        onNotesRead={handleNotesRead}
        onModuleRemove={moduleId => removeModule(activeBoard.id, moduleId)}
        onModuleDuplicate={moduleId => duplicateModule(activeBoard.id, moduleId)}
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="mx-auto w-full max-w-[1560px]">
        <div className="grid grid-cols-1 gap-8 xl:gap-10 md:grid-cols-2">
          <ColumnRail>{col1Modules.map(renderModule)}</ColumnRail>
          <ColumnRail>{col2Modules.map(renderModule)}</ColumnRail>
        </div>
      </div>
    </DndContext>
  )
}
