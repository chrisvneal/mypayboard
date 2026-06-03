'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardWorkspace } from '@/components/board/BoardWorkspace'
import { PayDateCardInlineForm } from '@/components/PayDateCardInlineForm'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import type { ModuleActions } from '@/components/modules/module-actions'
import type { PayDateModule as PayDateModuleModel } from '@/lib/types'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { moduleColorKey, useUserPrefs } from '@/lib/userPrefs'

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
    addModule,
  } = useMyPayBoard()

  const { prefs, patch } = useUserPrefs()
  const headerColorOverrides = prefs.moduleHeaderColors

  const board = getActiveBoard()
  const boardId = board?.id
  const [addingPayDateCard, setAddingPayDateCard] = useState(false)
  const inlineFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addingPayDateCard) return
    const timer = window.setTimeout(() => {
      const el = inlineFormRef.current
      if (!el) return
      const { bottom } = el.getBoundingClientRect()
      if (bottom > window.innerHeight - 48) {
        el.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }, 240)
    return () => window.clearTimeout(timer)
  }, [addingPayDateCard])

  const handleNotesRead = useCallback(
    (moduleId: string) => {
      if (!boardId) return
      markNotesRead(boardId, moduleId, data.currentUserId)
    },
    [boardId, data.currentUserId, markNotesRead]
  )

  const moduleActions = useMemo<ModuleActions>(
    () => ({
      onUpdate: (moduleId, changes) => {
        if (!boardId) return
        updateModule(boardId, moduleId, changes)
      },
      onBillToggle: (moduleId, billId) => {
        if (!boardId) return
        toggleBillPaid(boardId, moduleId, billId)
      },
      onBillMove: (fromModuleId, toModuleId, billId, beforeBillId) => {
        if (!boardId) return
        moveBill(boardId, fromModuleId, toModuleId, billId, beforeBillId)
      },
      onBillAdd: (moduleId, bill) => {
        if (!boardId) return
        addBill(boardId, moduleId, bill)
      },
      onCreditorAdd: addCreditor,
      onBillUpdate: (moduleId, billId, changes) => {
        if (!boardId) return
        updateBill(boardId, moduleId, billId, changes)
      },
      onBillRemove: (moduleId, billId) => {
        if (!boardId) return
        removeBill(boardId, moduleId, billId)
      },
      onNoteAdd: (moduleId, note) => {
        if (!boardId) return
        addNote(boardId, moduleId, note)
      },
      onNoteDelete: (moduleId, noteId) => {
        if (!boardId) return
        deleteNote(boardId, moduleId, noteId)
      },
      onNotesRead: handleNotesRead,
      onModuleRemove: moduleId => {
        if (!boardId) return
        removeModule(boardId, moduleId)
      },
      onModuleDuplicate: module => {
        if (!boardId) return
        const newModuleId = duplicateModule(boardId, module.id)
        const sourceOverride = headerColorOverrides[moduleColorKey(module)]
        if (newModuleId && sourceOverride) {
          patch(prev => ({
            moduleHeaderColors: {
              ...prev.moduleHeaderColors,
              [moduleColorKey({ id: newModuleId, owner: module.owner, templateModuleId: undefined })]:
                sourceOverride,
            },
          }))
        }
      },
      onHeaderColorSet: (module, hex) => {
        patch(prev => ({
          moduleHeaderColors: { ...prev.moduleHeaderColors, [moduleColorKey(module)]: hex },
        }))
      },
    }),
    [
      boardId,
      addBill,
      addCreditor,
      addNote,
      deleteNote,
      duplicateModule,
      handleNotesRead,
      headerColorOverrides,
      moveBill,
      patch,
      removeBill,
      removeModule,
      toggleBillPaid,
      updateBill,
      updateModule,
    ]
  )

  const handleSavePayDateCard = useCallback(
    (newModule: PayDateModuleModel) => {
      if (!boardId) return
      addModule(boardId, newModule)
      setAddingPayDateCard(false)
    },
    [addModule, boardId]
  )

  if (!isLoaded || !board || !boardId) {
    return (
      <div className="rounded-xl border border-border bg-(--bg-secondary) p-8 text-center text-(--text-secondary)">
        {!isLoaded ? 'Loading board…' : 'No active monthly board yet.'}
      </div>
    )
  }

  return (
    <BoardWorkspace
      boardId={boardId}
      modules={board.modules}
      month={board.month}
      year={board.year}
      boardMode="live"
      users={data.users}
      incomeSources={data.incomes.map(income => income.name)}
      creditors={data.creditors}
      expenseCategories={data.expenseCategories}
      currentUserId={data.currentUserId}
      moduleActions={moduleActions}
      payDateCardAddSlot={
        addingPayDateCard ? (
          <div ref={inlineFormRef} className="w-full scroll-mb-24 pb-24">
            <PayDateCardInlineForm
              variant="board"
              users={data.users}
              incomes={data.incomes}
              creditors={data.creditors}
              boardMonth={board.month}
              boardYear={board.year}
              defaultOwnerId={data.currentUserId}
              onSave={handleSavePayDateCard}
              onCancel={() => setAddingPayDateCard(false)}
            />
          </div>
        ) : (
          <PlaceholderCard label="Add pay date card" onClick={() => setAddingPayDateCard(true)} />
        )
      }
    />
  )
}
