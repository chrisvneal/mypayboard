'use client'

import { useEffect, useRef, useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical, Trash2, VolumeX } from 'lucide-react'
import type { Bill } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { BillRowColorPicker } from './BillRowColorPicker'

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
}: BillRowProps) {
  const [hovered, setHovered] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDue, setEditingDue] = useState(false)
  const [editingAmount, setEditingAmount] = useState(false)
  const [nameDraft, setNameDraft] = useState(bill.name)
  const [dueDraft, setDueDraft] = useState(bill.dueDate)
  const [amountDraft, setAmountDraft] = useState(formatCurrency(bill.amount))
  const [payAnim, setPayAnim] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)
  const colorAnchorRef = useRef<HTMLButtonElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const rowTint =
    bill.rowColor && bill.rowColor.toUpperCase() !== '#FFFFFF'
      ? bill.rowColor
      : undefined

  const handlePaidToggle = () => {
    if (bill.paid) {
      onTogglePaid()
      return
    }
    setPayAnim(true)
    window.setTimeout(() => {
      onTogglePaid()
      setPayAnim(false)
    }, 160)
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
        'bill-row group relative gap-2 px-1 transition-[opacity,background-color] duration-150 ease-out hover:bg-(--bg-tertiary)/60',
        bill.paid && 'paid',
        bill.muted && 'muted',
        isDragging && 'z-10 opacity-70 shadow-sm ring-1 ring-(--border-strong)',
        payAnim && 'opacity-40'
      )}
      style={{
        backgroundColor: rowTint ? `${rowTint}99` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

      {!sortable && <span className="w-5 shrink-0" aria-hidden />}

      <input
        type="checkbox"
        checked={bill.paid}
        onChange={handlePaidToggle}
        onPointerDown={e => e.stopPropagation()}
        className="mt-0.5 size-4 shrink-0 accent-(--navy)"
        aria-label={`Paid: ${bill.name}`}
      />

      <div className="relative shrink-0">
        <button
          ref={colorAnchorRef}
          type="button"
          title="Row color"
          aria-label="Row color"
          className="block h-[28px] w-1 shrink-0 rounded-sm transition-opacity hover:opacity-80"
          style={{
            backgroundColor: rowTint ?? 'var(--border)',
          }}
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

      <div className="bill-name min-w-0 flex-[1.4] text-[13px] font-medium">
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
              'w-full truncate rounded px-0.5 text-left hover:bg-black/3 dark:hover:bg-white/4',
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
          <button
            type="button"
            className={cn(
              'mt-0.5 block text-left text-[10px] font-medium tracking-wide text-(--text-tertiary) transition-colors hover:text-(--navy)',
              bill.promotedToMaster && 'pointer-events-none opacity-40'
            )}
            onClick={() => !bill.promotedToMaster && onUpdate({ promotedToMaster: true })}
            disabled={bill.promotedToMaster === true}
          >
            ★ Save to Master List
          </button>
        )}
      </div>

      <div className="w-[72px] shrink-0 text-[12px] text-(--text-tertiary)">
        {editingDue ? (
          <input
            value={dueDraft}
            onChange={e => setDueDraft(e.target.value)}
            className="w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 outline-none focus:border-(--navy)"
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
              'w-full truncate rounded px-0.5 text-left hover:bg-black/3 dark:hover:bg-white/4',
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

      <div className="min-w-[88px] shrink-0 text-right text-[13px] tabular-nums">
        {editingAmount ? (
          <input
            value={amountDraft}
            onChange={e => setAmountDraft(e.target.value)}
            className="w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-right outline-none focus:border-(--navy)"
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
            className="w-full rounded px-0.5 hover:bg-black/3 dark:hover:bg-white/4"
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
          'ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100',
          hovered && 'opacity-100'
        )}
      >
        <button
          type="button"
          className="rounded-md p-1 text-(--text-tertiary) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
          aria-label={bill.muted ? 'Unmute bill' : 'Mute bill'}
          onClick={onMute}
        >
          <VolumeX className="size-4" />
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
