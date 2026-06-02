'use client'

import { useCallback, useMemo } from 'react'
import { BoardWorkspace } from '@/components/board/BoardWorkspace'
import type { ModuleActions } from '@/components/modules/module-actions'
import type { PayDateModule as PayDateModuleModel } from '@/lib/types'
import { generateId } from '@/lib/format'
import { payDateToIso } from '@/lib/pay-date'
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

  const handleAddPayDateModule = useCallback(() => {
    if (!board || !boardId) return
    const d = new Date()
    const isoToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = payDateToIso(isoToday) || isoToday
    const maxSort = Math.max(0, ...board.modules.map(m => m.sortOrder))
    const owner = data.users.find(u => u.id === data.currentUserId)?.id ?? board.modules[0]?.owner ?? 'user-chris'
    const newModule: PayDateModuleModel = {
      id: generateId('mod'),
      owner,
      source: '',
      payDate: today || `${board.year}-${String(board.month).padStart(2, '0')}-15`,
      payAmount: null,
      bills: [],
      notes: [],
      isFromTemplate: false,
      sortOrder: maxSort + 1,
      headerColor: owner === 'user-nicole' ? '#E8F7EE' : '#E6F1FB',
    }
    addModule(boardId, newModule)
  }, [addModule, board, boardId, data.currentUserId, data.users])

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
      showAddPayDateCard
      onAddPayDateCard={handleAddPayDateModule}
    />
  )
}
