'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { PayDateModule } from '@/components/modules/PayDateModule'
import type { BoardColumn, PayDateModule as PayDateModuleModel } from '@/lib/types'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

function reorderUnpaid(module: PayDateModuleModel, activeId: string, overId: string) {
  const unpaid = module.bills.filter(b => !b.paid)
  const paid = module.bills.filter(b => b.paid)
  const ids = unpaid.map(b => b.id)
  const oldIndex = ids.indexOf(activeId)
  const newIndex = ids.indexOf(overId)
  if (oldIndex < 0 || newIndex < 0 || activeId === overId) return module.bills
  const nextIds = arrayMove(ids, oldIndex, newIndex)
  const map = new Map(unpaid.map(b => [b.id, b]))
  const nextUnpaid = nextIds.map(id => map.get(id)!)
  return [...nextUnpaid, ...paid]
}

function ColumnRail({ column, children }: { column: BoardColumn; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column}`,
    data: { type: 'column', column },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[280px] flex-1 flex-col gap-4 rounded-xl border border-transparent p-2 transition-colors duration-150 ease-out',
        isOver && 'border-[#185FA5]/35 bg-[color-mix(in_srgb,var(--navy-light)_30%,transparent)]'
      )}
    >
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
  } = useMyPayBoard()

  const board = getActiveBoard()

  const [billOverModuleId, setBillOverModuleId] = useState<string | null>(null)
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
    setDraggingBill(event.active.data.current?.type === 'bill')
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.data.current?.type !== 'bill') {
      setBillOverModuleId(null)
      return
    }
    const od = over.data.current as { type?: string; moduleId?: string } | undefined
    let modId: string | undefined
    if (od?.type === 'bill-zone') modId = od.moduleId
    else if (od?.type === 'bill') modId = od.moduleId
    setBillOverModuleId(modId ?? null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setBillOverModuleId(null)
      setDraggingBill(false)
      const { active, over } = event
      if (!board || !over) return

      if (active.data.current?.type === 'module') {
        const moduleId = active.data.current.moduleId as string
        const od = over.data.current as { type?: string; column?: BoardColumn } | undefined
        if (od?.type === 'column' && od.column) {
          updateModule(board.id, moduleId, { boardColumn: od.column })
        }
        return
      }

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
          const next = reorderUnpaid(fromModule, billId, over.id as string)
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
    setDraggingBill(false)
  }, [])

  const handleNotesRead = useCallback(
    (moduleId: string) => {
      if (!board) return
      markNotesRead(board.id, moduleId, data.currentUserId)
    },
    [board?.id, data.currentUserId, markNotesRead]
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
        allModules={activeBoard.modules}
        creditors={data.creditors}
        currentUserId={data.currentUserId}
        users={data.users}
        highlightBillDrop={draggingBill && billOverModuleId === m.id}
        onUpdate={(moduleId, changes) => updateModule(activeBoard.id, moduleId, changes)}
        onBillToggle={(moduleId, billId) => toggleBillPaid(activeBoard.id, moduleId, billId)}
        onBillMove={(fromModuleId, toModuleId, billId, beforeBillId) =>
          moveBill(activeBoard.id, fromModuleId, toModuleId, billId, beforeBillId)
        }
        onBillAdd={(moduleId, bill) => addBill(activeBoard.id, moduleId, bill)}
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
      <div className="grid gap-4 lg:grid-cols-2">
        <ColumnRail column={1}>{col1Modules.map(renderModule)}</ColumnRail>
        <ColumnRail column={2}>{col2Modules.map(renderModule)}</ColumnRail>
      </div>
    </DndContext>
  )
}
