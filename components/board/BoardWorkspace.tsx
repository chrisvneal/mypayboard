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
import type { ModuleActions } from '@/components/modules/module-actions'
import type { BoardMode } from '@/lib/board-workspace-types'
import type { Creditor, PayDateModule as PayDateModuleModel, User } from '@/lib/types'
import { payDateSortTime } from '@/lib/pay-date'
import { cn } from '@/lib/utils'
import { moduleColorKey, useUserPrefs } from '@/lib/userPrefs'
import { AddPayDateCardSlot } from './AddPayDateCardSlot'

export type { BoardMode } from '@/lib/board-workspace-types'

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

export type BoardWorkspaceProps = {
  boardId: string
  modules: PayDateModuleModel[]
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
  modules,
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

  const [billOverModuleId, setBillOverModuleId] = useState<string | null>(null)
  const [billOverBillId, setBillOverBillId] = useState<string | null>(null)
  const [billOverZoneOnly, setBillOverZoneOnly] = useState(false)
  const [billInsertionAfter, setBillInsertionAfter] = useState(false)
  const [draggingBill, setDraggingBill] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortedModules = useMemo(
    () =>
      [...modules].sort(
        (a, z) => payDateSortTime(a.payDate, a.sortOrder) - payDateSortTime(z.payDate, z.sortOrder)
      ),
    [modules]
  )

  const col1Modules = useMemo(() => sortedModules.filter((_, i) => i % 2 === 0), [sortedModules])
  const col2Modules = useMemo(() => sortedModules.filter((_, i) => i % 2 === 1), [sortedModules])

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
        const sourceModule = modules.find(m => m.id === fromModuleId)
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
    [modules]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setBillOverModuleId(null)
      setBillOverBillId(null)
      setBillOverZoneOnly(false)
      setBillInsertionAfter(false)
      setDraggingBill(false)
      const { active, over } = event
      if (!over) return

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

      const fromModule = modules.find(m => m.id === fromModuleId)
      if (!fromModule) return

      if (fromModuleId === toModuleId) {
        if (od?.type === 'bill' && billId !== over.id) {
          const next = reorderBills(fromModule, billId, over.id as string)
          moduleActions.onUpdate(fromModuleId, { bills: next })
        }
        return
      }

      moduleActions.onBillMove(fromModuleId, toModuleId, billId, beforeBillId)
    },
    [moduleActions, modules]
  )

  const handleDragCancel = useCallback(() => {
    setBillOverModuleId(null)
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

  function renderModule(m: PayDateModuleModel) {
    return (
      <PayDateModule
        key={m.id}
        module={m}
        boardId={boardId}
        boardMonth={month}
        boardYear={year}
        boardMode={boardMode}
        allModules={modules}
        creditors={creditors}
        currentUserId={currentUserId}
        users={users}
        incomeSources={incomeSources}
        expenseCategories={expenseCategories}
        headerColorOverride={headerColorOverrides[moduleColorKey(m)]}
        actions={moduleActions}
        highlightBillDrop={draggingBill && billOverModuleId === m.id}
        insertionTargetBillId={billOverModuleId === m.id ? billOverBillId : null}
        insertionLineAfter={billOverModuleId === m.id ? billInsertionAfter : false}
        insertionAtEnd={billOverModuleId === m.id && billOverZoneOnly}
      />
    )
  }

  const addSlot = payDateCardAddSlot
    ? payDateCardAddSlot
    : showAddPayDateCard && onAddPayDateCard ? (
        <AddPayDateCardSlot onClick={onAddPayDateCard} />
      ) : null

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
        {modules.length === 0 && !addSlot ? (
          <p className="rounded-lg border border-dashed border-border bg-(--bg-primary) px-6 py-12 text-center text-[13px] text-(--text-tertiary)">
            {emptyMessage}
          </p>
        ) : (
          <>
            {modules.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:gap-10">
                <ColumnRail>{col1Modules.map(renderModule)}</ColumnRail>
                <ColumnRail>{col2Modules.map(renderModule)}</ColumnRail>
              </div>
            ) : null}
            {addSlot ? (
              <div className={modules.length > 0 ? 'mt-6' : ''}>{addSlot}</div>
            ) : null}
          </>
        )}
      </div>
    </DndContext>
  )
}
