'use client'

import {
  DndContext,
  DragOverlay,
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
import { balanceToneClass, getRemainingTone } from '@/components/modules/balance-tone'
import type { BoardColumn, PayDateModule as PayDateModuleModel } from '@/lib/types'
import { formatCurrency, formatDate, useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

function reorderBills(module: PayDateModuleModel, activeId: string, overId: string) {
  const ids = module.bills.map(b => b.id)
  const oldIndex = ids.indexOf(activeId)
  const newIndex = ids.indexOf(overId)
  if (oldIndex < 0 || newIndex < 0 || activeId === overId) return module.bills
  const nextIds = arrayMove(ids, oldIndex, newIndex)
  const map = new Map(module.bills.map(b => [b.id, b]))
  return nextIds.map(id => map.get(id)!)
}

function ModuleDragOverlay({
  module,
  width,
}: {
  module: PayDateModuleModel
  width?: number
}) {
  const payAmount = module.payAmount ?? 0
  const remaining = payAmount - module.bills.filter(b => !b.muted).reduce((sum, bill) => sum + bill.amount, 0)
  const tone = getRemainingTone(remaining)

  return (
    <div className="module-card overflow-hidden" style={{ width }}>
      <div
        className="flex items-start justify-between gap-3 px-3 py-2.5"
        style={{ backgroundColor: module.headerColor ?? '#F1F5F9' }}
      >
        <div className="min-w-0">
          <div className="truncate font-semibold text-(--text-primary)">
            {module.source} - {formatDate(module.payDate)}
          </div>
          <div className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.02em] text-(--text-primary) tabular-nums">
            {formatCurrency(payAmount)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] font-medium tracking-wide text-(--text-tertiary)">Remaining</div>
          <div className={cn('balance-display tabular-nums', balanceToneClass(tone))}>
            {formatCurrency(remaining)}
          </div>
        </div>
      </div>
    </div>
  )
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
  const boardId = board?.id

  const [billOverModuleId, setBillOverModuleId] = useState<string | null>(null)
  const [billOverBillId, setBillOverBillId] = useState<string | null>(null)
  const [billOverZoneOnly, setBillOverZoneOnly] = useState(false)
  const [activeBillFromModuleId, setActiveBillFromModuleId] = useState<string | null>(null)
  const [draggingBill, setDraggingBill] = useState(false)
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [activeModuleWidth, setActiveModuleWidth] = useState<number | undefined>(undefined)

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
    const type = event.active.data.current?.type
    if (type === 'bill') {
      setDraggingBill(true)
      setActiveBillFromModuleId(event.active.data.current?.moduleId as string)
      return
    }
    if (type === 'module') {
      setActiveModuleId(event.active.data.current?.moduleId as string)
      setActiveModuleWidth(event.active.rect.current.initial?.width)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.data.current?.type !== 'bill') {
      setBillOverModuleId(null)
      setBillOverBillId(null)
      setBillOverZoneOnly(false)
      return
    }
    const od = over.data.current as { type?: string; moduleId?: string } | undefined
    let modId: string | undefined
    if (od?.type === 'bill-zone') {
      modId = od.moduleId
      setBillOverBillId(null)
      setBillOverZoneOnly(true)
    } else if (od?.type === 'bill') {
      modId = od.moduleId
      setBillOverBillId(over.id as string)
      setBillOverZoneOnly(false)
    }
    setBillOverModuleId(modId ?? null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setBillOverModuleId(null)
      setBillOverBillId(null)
      setBillOverZoneOnly(false)
      setActiveBillFromModuleId(null)
      setDraggingBill(false)
      setActiveModuleId(null)
      setActiveModuleWidth(undefined)
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
    setActiveBillFromModuleId(null)
    setDraggingBill(false)
    setActiveModuleId(null)
    setActiveModuleWidth(undefined)
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
        allModules={activeBoard.modules}
        creditors={data.creditors}
        currentUserId={data.currentUserId}
        users={data.users}
        highlightBillDrop={draggingBill && activeBillFromModuleId !== m.id && billOverModuleId === m.id}
        insertionTargetBillId={billOverModuleId === m.id ? billOverBillId : null}
        insertionAtEnd={billOverModuleId === m.id && billOverZoneOnly}
        useModuleDragOverlay
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
      <DragOverlay dropAnimation={null}>
        {activeModuleId ? (
          <ModuleDragOverlay
            module={activeBoard.modules.find(m => m.id === activeModuleId) ?? activeBoard.modules[0]}
            width={activeModuleWidth}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
