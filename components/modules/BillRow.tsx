'use client'

import { useEffect, useRef, useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react'
import type { Bill } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'
import { BillRowColorPicker } from './BillRowColorPicker'
import { DueDateField } from './DueDateField'

const PAID_ACKNOWLEDGE_MS = 550

export type BillRowProps = {
  bill: Bill
  moduleId: string
  boardMonth?: number
  boardYear?: number
  isDragging?: boolean
  sortable?: boolean
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
  onTogglePaid: () => void
  onPaidPendingChange?: (pending: boolean) => void
  onUpdate: (changes: Partial<Bill>) => void
  onRemove: () => void
  onMute: () => void
  onSaveToMaster: () => void
  onColorChange: (hex: string | undefined) => void
  showInsertionLine?: boolean
  insertionLineAfter?: boolean
  /** Template blueprint: hide paid checkbox */
  hidePaidControl?: boolean
}

const SAVED_TO_MASTER_MS = 1200

export function BillRow({
  bill,
  moduleId,
  boardMonth,
  boardYear,
  isDragging,
  sortable,
  dragAttributes,
  dragListeners,
  onTogglePaid,
  onPaidPendingChange,
  onUpdate,
  onRemove,
  onMute,
  onSaveToMaster,
  onColorChange,
  showInsertionLine,
  insertionLineAfter,
  hidePaidControl = false,
}: BillRowProps) {
  const [hovered, setHovered] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingAmount, setEditingAmount] = useState(false)
  const [nameDraft, setNameDraft] = useState(bill.name)
  const [amountDraft, setAmountDraft] = useState(formatCurrency(bill.amount))
  const [pendingPaid, setPendingPaid] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [savedToMasterVisible, setSavedToMasterVisible] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)
  const colorAnchorRef = useRef<HTMLButtonElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const paidTimerRef = useRef<number | null>(null)
  const savedToMasterTimerRef = useRef<number | null>(null)
  const pendingPaidRef = useRef(false)
  const onPaidPendingChangeRef = useRef(onPaidPendingChange)

  useEffect(() => {
    onPaidPendingChangeRef.current = onPaidPendingChange
  }, [onPaidPendingChange])

  useEffect(() => {
    if (!bill.paid) return
    queueMicrotask(() => setPendingPaid(false))
  }, [bill.paid])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  useEffect(() => {
    if (!editingAmount) return
    amountInputRef.current?.focus()
    requestAnimationFrame(() => amountInputRef.current?.select())
  }, [editingAmount])

  useEffect(() => {
    pendingPaidRef.current = pendingPaid
  }, [pendingPaid])

  useEffect(() => {
    return () => {
      if (paidTimerRef.current) window.clearTimeout(paidTimerRef.current)
      if (savedToMasterTimerRef.current) window.clearTimeout(savedToMasterTimerRef.current)
      if (pendingPaidRef.current) onPaidPendingChangeRef.current?.(false)
    }
  }, [])

  const rowTint =
    bill.rowColor && bill.rowColor.toUpperCase() !== '#FFFFFF'
      ? bill.rowColor
      : undefined

  const handlePaidToggle = () => {
    if (bill.paid) {
      if (paidTimerRef.current) window.clearTimeout(paidTimerRef.current)
      setPendingPaid(false)
      onPaidPendingChange?.(false)
      onTogglePaid()
      return
    }
    if (pendingPaid) return

    setPendingPaid(true)
    onPaidPendingChange?.(true)
    paidTimerRef.current = window.setTimeout(() => {
      onTogglePaid()
      setPendingPaid(false)
      onPaidPendingChange?.(false)
      paidTimerRef.current = null
    }, PAID_ACKNOWLEDGE_MS)
  }

  const saveName = () => {
    const next = nameDraft.trim()
    if (next && next !== bill.name) onUpdate({ name: next })
    setEditingName(false)
  }

  const year = boardYear ?? new Date().getFullYear()

  const saveAmount = () => {
    const n = parseMoneyInput(amountDraft)
    if (n !== null && n !== bill.amount) onUpdate({ amount: n })
    setAmountDraft(n !== null ? formatCurrency(n) : formatCurrency(bill.amount))
    setEditingAmount(false)
  }

  return (
    <div
      ref={rowRef}
      data-module-id={moduleId}
      className={cn(
        'bill-row group relative transition-[background-color] duration-150 ease-out',
        !bill.paid &&
          !pendingPaid &&
          'hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_35%,transparent)]',
        bill.paid && 'paid',
        pendingPaid && !bill.paid && 'pending-paid',
        bill.muted && 'muted',
        isDragging && 'z-10 opacity-70 shadow-sm ring-1 ring-(--border-strong)'
      )}
      style={{
        backgroundColor: rowTint ? `${rowTint}99` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showInsertionLine && (
        <div
          className={cn(
            'absolute inset-x-0 z-10 h-0.5 bg-[#185FA5]',
            insertionLineAfter ? 'bottom-0' : 'top-0'
          )}
          aria-hidden
        />
      )}

      {sortable && (
        <button
          type="button"
          className={cn(
            'flex shrink-0 cursor-grab touch-none items-center justify-center rounded p-0.5 text-(--text-tertiary) opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100',
            hovered && 'opacity-100'
          )}
          aria-label="Reorder bill"
          {...dragAttributes}
          {...(dragListeners ?? {})}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {!sortable && <span aria-hidden />}

      <div className="bill-row-cell-check">
        {hidePaidControl ? (
          <span className="inline-block size-4" aria-hidden />
        ) : (
          <input
            type="checkbox"
            checked={bill.paid || pendingPaid}
            onChange={handlePaidToggle}
            onPointerDown={e => e.stopPropagation()}
            className="size-4 accent-(--navy)"
            aria-label={`Paid: ${bill.name}`}
          />
        )}
      </div>

      <div className="relative shrink-0">
        <button
          ref={colorAnchorRef}
          type="button"
          title="Row color"
          aria-label="Row color"
          className="bill-row-pipe block h-[28px] w-1 shrink-0 rounded-sm bg-border transition-[background-color,filter] duration-150"
          style={rowTint ? { backgroundColor: rowTint } : undefined}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setColorOpen(o => !o)}
        />
        <BillRowColorPicker
          open={colorOpen}
          anchorRef={colorAnchorRef}
          onClose={() => setColorOpen(false)}
          onPick={hex => {
            onColorChange(hex)
            setColorOpen(false)
          }}
        />
      </div>

      <div className="bill-name min-w-0 overflow-hidden text-left text-[13px] font-medium">
        <div className="inline-flex max-w-full items-center gap-1.5">
          {editingName ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                className="min-w-[4ch] max-w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-[13px] font-medium outline-none focus:border-(--navy)"
                onBlur={saveName}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') {
                    setNameDraft(bill.name)
                    setEditingName(false)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className={cn(
                  'max-w-full truncate rounded px-0.5 text-left',
                  bill.muted && 'italic'
                )}
                onClick={() => {
                  setNameDraft(bill.name)
                  setEditingName(true)
                }}
              >
                {bill.name}
              </button>
            )}
          {savedToMasterVisible ? (
            // Show after promotion regardless of origin (the save flips origin to
            // 'master', so this must not be gated on origin === 'oneoff').
            <span className="shrink-0">
              <span className="saved-master-confirmation text-[10px] font-medium tracking-wide">
                Saved
              </span>
            </span>
          ) : bill.origin === 'oneoff' && !bill.promotedToMaster ? (
            <span className="shrink-0">
              <button
                type="button"
                className="text-[10px] font-medium tracking-wide text-(--text-tertiary) transition-colors duration-150 hover:text-(--navy)"
                onClick={() => {
                  onSaveToMaster()
                  setSavedToMasterVisible(true)
                  if (savedToMasterTimerRef.current) window.clearTimeout(savedToMasterTimerRef.current)
                  savedToMasterTimerRef.current = window.setTimeout(() => {
                    setSavedToMasterVisible(false)
                    savedToMasterTimerRef.current = null
                  }, SAVED_TO_MASTER_MS)
                }}
              >
                Save to Master
              </button>
            </span>
          ) : null}
        </div>
      </div>

      <div className="bill-row-cell-due">
        <DueDateField
          variant="row"
          value={bill.dueDate}
          boardMonth={boardMonth}
          boardYear={year}
          onChange={dueDate => onUpdate({ dueDate })}
        />
      </div>

      <div className="bill-row-cell-amount text-[13px]">
        {editingAmount ? (
          <input
            ref={amountInputRef}
            value={amountDraft}
            onChange={e => setAmountDraft(e.target.value)}
            onFocus={e => e.currentTarget.select()}
            onClick={e => e.currentTarget.select()}
            className="inline-currency-input w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 outline-none focus:border-(--navy)"
            onBlur={saveAmount}
            onKeyDown={e => {
              if (e.key === 'Enter') saveAmount()
              if (e.key === 'Escape') {
                setAmountDraft(formatCurrency(bill.amount))
                setEditingAmount(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="w-full rounded px-0"
            onClick={() => {
              setAmountDraft(formatCurrency(bill.amount))
              setEditingAmount(true)
            }}
          >
            {formatCurrency(bill.amount)}
          </button>
        )}
      </div>

      <div
        className={cn(
          'bill-row-actions gap-0.5 transition-opacity',
          bill.muted || hovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <button
          type="button"
          className={cn(
            'rounded-md p-1 transition-colors duration-150 hover:text-(--text-primary)',
            bill.muted ? 'text-(--text-primary)' : 'text-(--text-tertiary)'
          )}
          aria-pressed={bill.muted}
          aria-label={bill.muted ? 'Muted — click to include in plan' : 'Mute bill'}
          title={bill.muted ? 'Muted — click to include in plan' : 'Mute bill'}
          onClick={onMute}
        >
          {bill.muted ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
        <button
          type="button"
          className={cn(
            'rounded-md p-1 text-(--text-tertiary) transition-colors duration-150 hover:text-(--danger)',
            bill.muted && !hovered && 'opacity-0 group-hover:opacity-100'
          )}
          aria-label="Remove bill"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
