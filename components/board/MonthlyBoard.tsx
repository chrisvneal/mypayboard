'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardWorkspace } from '@/components/board/BoardWorkspace'
import { CreateMonthModal } from '@/components/CreateMonthModal'
import { PayDateCardInlineForm } from '@/components/PayDateCardInlineForm'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import type { ModuleActions } from '@/components/modules/module-actions'
import type { PayDateCard } from '@/lib/types'
import { scrollPayDateCardFormHostOnNextFrame } from '@/lib/pay-date-card-form-scroll'
import { categoryNamesForLegacyUI } from '@/lib/category-definitions'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { moduleColorKey, useUserPrefs } from '@/lib/userPrefs'

export function MonthlyBoard() {
  const {
    data,
    isLoaded,
    getActiveBoard,
    updatePayDateCard,
    toggleBillPaid,
    moveBill,
    addBill,
    updateBill,
    removeBill,
    addNote,
    deleteNote,
    markNotesRead,
    removePayDateCard,
    duplicatePayDateCard,
    addCreditor,
    addPayDateCard,
  } = useMyPayBoard()

  const { prefs, patch } = useUserPrefs()
  const headerColorOverrides = prefs.moduleHeaderColors

  const board = getActiveBoard()
  const boardId = board?.id
  const [addingPayDateCard, setAddingPayDateCard] = useState(false)
  const [createBoardOpen, setCreateBoardOpen] = useState(false)
  const inlineFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addingPayDateCard) return
    scrollPayDateCardFormHostOnNextFrame(() => inlineFormRef.current)
  }, [addingPayDateCard])

  // Close form when the active board switches (e.g. user creates a new board while form is open)
  useEffect(() => {
    setAddingPayDateCard(false)
  }, [boardId])

  // Close form on click-outside (bubble phase so Radix/shadcn portaled popovers
  // that call stopPropagation — Select, calendar — don't accidentally trigger a close)
  useEffect(() => {
    if (!addingPayDateCard) return
    function onPointerDown(e: PointerEvent) {
      if (inlineFormRef.current?.contains(e.target as Node)) return
      setAddingPayDateCard(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [addingPayDateCard])

  const handleNotesRead = useCallback(
    (cardId: string) => {
      if (!boardId) return
      markNotesRead(boardId, cardId, data.currentUserId)
    },
    [boardId, data.currentUserId, markNotesRead]
  )

  const moduleActions = useMemo<ModuleActions>(
    () => ({
      onUpdate: (cardId, changes) => {
        if (!boardId) return
        updatePayDateCard(boardId, cardId, changes)
      },
      onBillToggle: (cardId, billId) => {
        if (!boardId) return
        toggleBillPaid(boardId, cardId, billId)
      },
      onBillMove: (fromCardId, toCardId, billId, beforeBillId) => {
        if (!boardId) return
        moveBill(boardId, fromCardId, toCardId, billId, beforeBillId)
      },
      onBillAdd: (cardId, bill) => {
        if (!boardId) return
        addBill(boardId, cardId, bill)
      },
      onCreditorAdd: addCreditor,
      onBillUpdate: (cardId, billId, changes) => {
        if (!boardId) return
        updateBill(boardId, cardId, billId, changes)
      },
      onBillRemove: (cardId, billId) => {
        if (!boardId) return
        removeBill(boardId, cardId, billId)
      },
      onNoteAdd: (cardId, note) => {
        if (!boardId) return
        addNote(boardId, cardId, note)
      },
      onNoteDelete: (cardId, noteId) => {
        if (!boardId) return
        deleteNote(boardId, cardId, noteId)
      },
      onNotesRead: handleNotesRead,
      onPayDateCardRemove: cardId => {
        if (!boardId) return
        removePayDateCard(boardId, cardId)
      },
      onPayDateCardDuplicate: card => {
        if (!boardId) return
        const newCardId = duplicatePayDateCard(boardId, card.id)
        const sourceOverride = headerColorOverrides[moduleColorKey(card)]
        if (newCardId && sourceOverride) {
          patch(prev => ({
            moduleHeaderColors: {
              ...prev.moduleHeaderColors,
              [moduleColorKey({ id: newCardId, owner: card.owner, templatePayDateCardId: undefined })]:
                sourceOverride,
            },
          }))
        }
      },
      onHeaderColorSet: (card, hex) => {
        patch(prev => ({
          moduleHeaderColors: { ...prev.moduleHeaderColors, [moduleColorKey(card)]: hex },
        }))
      },
    }),
    [
      boardId,
      addBill,
      addCreditor,
      addNote,
      deleteNote,
      duplicatePayDateCard,
      handleNotesRead,
      headerColorOverrides,
      moveBill,
      patch,
      removeBill,
      removePayDateCard,
      toggleBillPaid,
      updateBill,
      updatePayDateCard,
    ]
  )

  const handleSavePayDateCard = useCallback(
    (newCard: PayDateCard) => {
      if (!boardId) return
      addPayDateCard(boardId, newCard)
      setAddingPayDateCard(false)
    },
    [addPayDateCard, boardId]
  )

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-border bg-(--bg-secondary) p-8 text-center text-(--text-secondary)">
        Loading board…
      </div>
    )
  }

  if (!board || !boardId) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-(--bg-primary) px-8 py-16 text-center shadow-(--shadow-sm)">
          <p className="text-[15px] font-semibold text-(--text-primary)">No active pay board yet.</p>
          <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-(--text-secondary)">
            Create your first pay board to start planning your upcoming paychecks.
          </p>
          <button
            type="button"
            onClick={() => setCreateBoardOpen(true)}
            className="btn-navy mt-6 inline-flex h-9 cursor-pointer items-center rounded-md px-4 text-[13px] font-semibold shadow-(--shadow-sm)"
          >
            Create your first Pay Board
          </button>
        </div>
        <CreateMonthModal open={createBoardOpen} onClose={() => setCreateBoardOpen(false)} />
      </>
    )
  }

  return (
    <BoardWorkspace
      key={boardId}
      boardId={boardId}
      payDateCards={board.payDateCards}
      month={board.month}
      year={board.year}
      boardMode="live"
      users={data.users}
      incomeSources={data.incomes.map(income => income.name)}
      creditors={data.creditors}
      expenseCategories={categoryNamesForLegacyUI(data.expenseCategories)}
      currentUserId={data.currentUserId}
      moduleActions={moduleActions}
      payDateCardAddSlot={
        addingPayDateCard ? (
          <div ref={inlineFormRef} className="w-full max-w-[320px]">
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
