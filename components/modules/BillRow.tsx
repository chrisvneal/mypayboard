'use client'

import { useEffect, useRef, useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { EyeOff, GripVertical, Trash2 } from 'lucide-react'
import type { Bill } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { BillRowColorPicker } from './BillRowColorPicker'

const PAID_ACKNOWLEDGE_MS = 900

export type BillRowProps = {
  bill: Bill
  moduleId: string
  isDragging?: boolean
  sortable?: boolean
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
  onTogglePaid: () => void
  onUpdate: (changes: Partial<Bill>) => void
  onRemove: () => void
  onMute: () => void
  onColorChange: (hex: string | undefined) => void
  showInsertionLine?: boolean
}

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

export function BillRow({
  bill,
  moduleId,
  isDragging,
  sortable,
  dragAttributes,
  dragListeners,
  onTogglePaid,
  onUpdate,
  onRemove,
  onMute,
  onColorChange,
  showInsertionLine,
}: BillRowProps) {
  const [hovered, setHovered] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDue, setEditingDue] = useState(false)
  const [editingAmount, setEditingAmount] = useState(false)
  const [nameDraft, setNameDraft] = useState(bill.name)
  const [dueDraft, setDueDraft] = useState(bill.dueDate)
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

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  useEffect(() => {
    if (!editingAmount) return
    amountInputRef.current?.focus()
    requestAnimationFrame(() => amountInputRef.current?.select())
  }, [editingAmount])

  useEffect(() => {
    return () => {
      if (paidTimerRef.current) window.clearTimeout(paidTimerRef.current)
      if (savedToMasterTimerRef.current) window.clearTimeout(savedToMasterTimerRef.current)
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
      onTogglePaid()
      return
    }
    if (pendingPaid) return

    setPendingPaid(true)
    paidTimerRef.current = window.setTimeout(() => {
      onTogglePaid()
      setPendingPaid(false)
      paidTimerRef.current = null
    }, PAID_ACKNOWLEDGE_MS)
  }

  const saveName = () => {
    const next = nameDraft.trim()
    if (next && next !== bill.name) onUpdate({ name: next })
    setEditingName(false)
  }

  const saveDue = () => {
    if (dueDraft !== bill.dueDate) onUpdate({ dueDate: dueDraft.trim() })
    setEditingDue(false)
  }

  const saveAmount = () => {
    const n = parseMoneyInput(amountDraft)
    if (n !== null && n !== bill.amount) onUpdate({ amount: n })
    else setAmountDraft(formatCurrency(bill.amount))
    setEditingAmount(false)
  }

  return (
    <div
      ref={rowRef}
      data-module-id={moduleId}
      className={cn(
        'bill-row group relative px-1 transition-[opacity,background-color] duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_60%,transparent)]',
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
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-[#185FA5]" aria-hidden />
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
        <input
          type="checkbox"
          checked={bill.paid || pendingPaid}
          onChange={handlePaidToggle}
          onPointerDown={e => e.stopPropagation()}
          className="size-4 accent-(--navy)"
          aria-label={`Paid: ${bill.name}`}
        />
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

      <div className="bill-name min-w-0 text-left text-[13px] font-medium">
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            className="w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-[13px] font-medium outline-none focus:border-(--navy)"
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
              'w-full truncate rounded px-0.5 text-left',
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
        {bill.origin === 'oneoff' && (
          <div className="mt-0.5 h-[14px] leading-[14px]">
            {!bill.promotedToMaster ? (
              <button
                type="button"
                className="block text-left text-[10px] font-medium tracking-wide text-(--text-tertiary) transition-colors duration-150 hover:text-(--navy)"
                onClick={() => {
                  onUpdate({ promotedToMaster: true })
                  setSavedToMasterVisible(true)
                  if (savedToMasterTimerRef.current) window.clearTimeout(savedToMasterTimerRef.current)
                  savedToMasterTimerRef.current = window.setTimeout(() => {
                    setSavedToMasterVisible(false)
                    savedToMasterTimerRef.current = null
                  }, 2000)
                }}
              >
                Save to Master List
              </button>
            ) : savedToMasterVisible ? (
              <div className="saved-master-confirmation text-[10px] font-medium tracking-wide text-(--green)">
                Saved to Master List
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="bill-row-cell-due">
        {editingDue ? (
          <input
            value={dueDraft}
            onChange={e => setDueDraft(e.target.value)}
            className="w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-center outline-none focus:border-(--navy)"
            onBlur={saveDue}
            onKeyDown={e => {
              if (e.key === 'Enter') saveDue()
              if (e.key === 'Escape') {
                setDueDraft(bill.dueDate)
                setEditingDue(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={cn(
              'w-full truncate rounded px-0.5 text-center',
              !bill.dueDate && 'text-transparent'
            )}
            onClick={() => {
              setDueDraft(bill.dueDate)
              setEditingDue(true)
            }}
          >
            {bill.dueDate || '\u00a0'}
          </button>
        )}
      </div>

      <div className="bill-row-cell-amount text-[13px]">
        {editingAmount ? (
          <input
            ref={amountInputRef}
            value={amountDraft}
            onChange={e => setAmountDraft(e.target.value)}
            onFocus={e => e.currentTarget.select()}
            onClick={e => e.currentTarget.select()}
            className="w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 outline-none focus:border-(--navy)"
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
            className="w-full rounded px-0.5"
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
          'flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100',
          hovered && 'opacity-100'
        )}
      >
        <button
          type="button"
          className="rounded-md p-1 text-(--text-tertiary) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          aria-label={bill.muted ? 'Unmute bill' : 'Mute bill'}
          onClick={onMute}
        >
          <EyeOff className="size-4" />
        </button>
        <button
          type="button"
          className="rounded-md p-1 text-(--text-tertiary) hover:bg-(--danger-light) hover:text-(--danger)"
          aria-label="Remove bill"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
