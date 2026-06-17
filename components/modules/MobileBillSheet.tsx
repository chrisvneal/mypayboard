'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Bill } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn, useIsClient } from '@/lib/utils'
import { DueDateField } from './DueDateField'

export type MobileBillSheetProps = {
  bill: Bill | null
  open: boolean
  boardMonth?: number
  boardYear: number
  onClose: () => void
  /** Call with the partial changes that should be persisted. */
  onSave: (changes: Partial<Bill>) => void
  /** Toggle the bill's paid state — called only if paid changed. */
  onTogglePaid: () => void
}

/**
 * Slide-up bottom sheet for editing a bill on mobile (< md).
 * Hidden at md and above — never mounts into the desktop layout.
 * Rendered via createPortal so it escapes any overflow:hidden ancestors.
 */
export function MobileBillSheet({
  bill,
  open,
  boardMonth,
  boardYear,
  onClose,
  onSave,
  onTogglePaid,
}: MobileBillSheetProps) {
  const mounted = useIsClient()

  // Draft state — synced from bill each time the sheet opens.
  const [nameDraft, setNameDraft] = useState('')
  const [amountDraft, setAmountDraft] = useState('')
  const [dueDateDraft, setDueDateDraft] = useState('')
  const [paidDraft, setPaidDraft] = useState(false)

  // Controls the CSS slide-in transition. Set to true one frame after open,
  // so the browser can paint the off-screen starting position first.
  const [shown, setShown] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (open && bill) {
      setNameDraft(bill.name)
      setAmountDraft(formatCurrency(bill.amount))
      setDueDateDraft(bill.dueDate ?? '')
      setPaidDraft(bill.paid)
      // Trigger slide-up on next frame
      rafRef.current = requestAnimationFrame(() => setShown(true))
    } else {
      setShown(false)
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [open, bill])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleSave = () => {
    if (!bill) return
    const changes: Partial<Bill> = {}
    const trimmedName = nameDraft.trim()
    if (trimmedName && trimmedName !== bill.name) changes.name = trimmedName
    const parsed = parseMoneyInput(amountDraft)
    if (parsed !== null && parsed !== bill.amount) changes.amount = parsed
    if (dueDateDraft !== (bill.dueDate ?? '')) changes.dueDate = dueDateDraft
    if (Object.keys(changes).length > 0) onSave(changes)
    if (paidDraft !== bill.paid) onTogglePaid()
    onClose()
  }

  if (!mounted || !open || !bill) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
      role="dialog"
      aria-modal
      aria-label="Edit bill"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity duration-200"
        style={{ opacity: shown ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className="relative max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-(--bg-primary) shadow-xl"
        style={{
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 200ms ease-out',
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Drag handle pill — visual only */}
        <div className="flex justify-center pb-1 pt-3" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <h2 className="text-[15px] font-semibold text-(--text-primary)">Edit Bill</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-(--text-tertiary) transition-colors duration-150 hover:bg-(--bg-secondary) hover:text-(--text-primary)"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-4 px-4 pb-4">

          {/* Bill name */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
              Bill name
            </label>
            <input
              type="text"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              className="w-full rounded-lg border border-border bg-(--bg-secondary) px-3 py-2.5 text-[14px] text-(--text-primary) outline-none transition-colors duration-150 focus:border-(--navy)"
            />
          </div>

          {/* Amount + Due date — side by side */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
                Amount
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amountDraft}
                onChange={e => setAmountDraft(e.target.value)}
                onFocus={e => e.currentTarget.select()}
                className="w-full rounded-lg border border-border bg-(--bg-secondary) px-3 py-2.5 text-[14px] tabular-nums text-(--text-primary) outline-none transition-colors duration-150 focus:border-(--navy)"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
                Due date
              </label>
              <DueDateField
                variant="form"
                value={dueDateDraft}
                boardMonth={boardMonth}
                boardYear={boardYear}
                onChange={setDueDateDraft}
              />
            </div>
          </div>

          {/* Paid toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-(--bg-secondary) px-4 py-3">
            <div>
              <p className="text-[14px] font-medium text-(--text-primary)">Paid</p>
              <p className="text-[12px] text-(--text-tertiary)">
                Mark this bill as paid for the period
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={paidDraft}
              onClick={() => setPaidDraft(v => !v)}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                paidDraft ? 'bg-(--navy)' : 'border border-border bg-(--bg-tertiary)'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform duration-200',
                  paidDraft ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Save button — sticky at bottom so it stays visible when the keyboard is open */}
        <div className="sticky bottom-0 border-t border-border bg-(--bg-primary) px-4 py-3">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-lg bg-(--navy-action) py-3 text-[14px] font-semibold text-(--navy-action-fg) transition-colors duration-150 hover:bg-(--navy-action-hover) active:bg-(--navy-action-hover)"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
