'use client'

import { useEffect, useRef, useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { Check, Eye, EyeOff, RotateCcw, Trash2 } from 'lucide-react'
import { ConfirmButton } from '@/components/ConfirmButton'
import { ARCHIVED_BILL_REVIEW_MESSAGE } from '@/lib/template-archived-bills'
import type { Bill } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'
import { BillRowColorPicker } from './BillRowColorPicker'
import { DueDateField } from './DueDateField'

const PAID_ACKNOWLEDGE_MS = 550

export type BillRowProps = {
  bill: Bill
  cardId: string
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
  /** Template editor: drop checkbox column but keep drag handle */
  omitCheckColumn?: boolean
  /** Template editor: omit checkbox and drag-handle columns */
  compact?: boolean
  /** Template editor: show due date as day-of-month only */
  dueDateDayOnly?: boolean
  /** Master list entry archived/inactive — template editor warning state */
  archivedInMasterList?: boolean
  onRestoreInMasterList?: () => void
  onRemoveFromTemplate?: () => void
}

const SAVED_TO_MASTER_MS = 1200

export function BillRow({
  bill,
  cardId,
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
  omitCheckColumn = false,
  compact = false,
  dueDateDayOnly = false,
  archivedInMasterList = false,
  onRestoreInMasterList,
  onRemoveFromTemplate,
}: BillRowProps) {
  const templateArchivedRow = archivedInMasterList && (onRestoreInMasterList || onRemoveFromTemplate)

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
  const hideSecondaryActions = bill.muted && !hovered
  const dueDateRowTone = bill.paid ? 'paid' : pendingPaid ? 'pendingPaid' : 'default'
  const paidRowTextClass =
    bill.paid && !bill.muted ? 'italic text-(--text-tertiary)' : undefined
  const pendingPaidRowTextClass =
    pendingPaid && !bill.paid && !bill.muted ? 'text-(--text-secondary)' : undefined
  const settledRowTextClass = cn(paidRowTextClass, pendingPaidRowTextClass)

  const saveAmount = () => {
    const n = parseMoneyInput(amountDraft)
    if (n !== null && n !== bill.amount) onUpdate({ amount: n })
    setAmountDraft(n !== null ? formatCurrency(n) : formatCurrency(bill.amount))
    setEditingAmount(false)
  }

  return (
    <div
      ref={rowRef}
      data-card-id={cardId}
      className={cn(
        'bill-row group relative transition-[background-color] duration-150 ease-out',
        omitCheckColumn && 'bill-row--template',
        compact && 'bill-row--compact',
        bill.paid && 'paid',
        pendingPaid && !bill.paid && 'pending-paid',
        bill.muted && 'muted',
        templateArchivedRow && 'archived-in-master bg-amber-50/40 dark:bg-amber-950/12',
        !templateArchivedRow &&
          !bill.paid &&
          !pendingPaid &&
          'hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_35%,transparent)]',
        isDragging && 'z-10 opacity-70 shadow-sm ring-1 ring-(--border-strong)'
      )}
      style={{
        backgroundColor:
          templateArchivedRow || !rowTint ? undefined : `${rowTint}99`,
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

      {!compact && !omitCheckColumn ? (
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
      ) : null}

      {!compact ? (
        <div className="relative flex h-[28px] w-3 shrink-0 items-center justify-center">
          <span
            aria-hidden
            className={cn(
              'pointer-events-none rounded-full bg-(--text-tertiary)/45 transition-all duration-150 ease-out',
              'size-1.5',
              sortable && 'group-hover:h-[22px] group-hover:w-1 group-hover:rounded-sm group-hover:bg-border',
              sortable && hovered && 'h-[22px] w-1 rounded-sm bg-border'
            )}
          />
          {sortable ? (
            <button
              type="button"
              className="absolute inset-0 cursor-grab touch-none opacity-0 active:cursor-grabbing"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              onPointerDown={e => e.stopPropagation()}
              {...dragAttributes}
              {...(dragListeners ?? {})}
            />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'bill-name min-w-0 overflow-hidden text-left text-[13px] font-medium',
          settledRowTextClass
        )}
      >
        <div
          className={cn(
            'items-center gap-1.5',
            editingName ? 'flex w-full min-w-0' : 'inline-flex max-w-full'
          )}
        >
          {editingName ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                className={cn(
                  'min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-[13px] font-medium outline-none focus:border-(--navy)',
                  settledRowTextClass
                )}
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
                  archivedInMasterList && 'text-(--text-secondary)',
                  settledRowTextClass
                )}
                onClick={() => {
                  setNameDraft(bill.name)
                  setEditingName(true)
                }}
              >
                {bill.name}
              </button>
            )}
          {archivedInMasterList ? (
            <span
              className="shrink-0 rounded-full border border-amber-500/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-400/50 dark:text-amber-200/90"
              title={ARCHIVED_BILL_REVIEW_MESSAGE}
            >
              Archived
            </span>
          ) : null}
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

      <div
        className={cn(
          'bill-row-cell-due',
          archivedInMasterList && 'text-(--text-secondary) opacity-75',
          bill.muted && 'italic text-(--text-tertiary)',
          settledRowTextClass
        )}
      >
        <DueDateField
          variant="row"
          rowTone={dueDateRowTone}
          value={bill.dueDate}
          boardMonth={boardMonth}
          boardYear={year}
          onChange={dueDate => onUpdate({ dueDate })}
          dayOnly={dueDateDayOnly}
        />
      </div>

      <div
        className={cn(
          'bill-row-cell-amount text-[13px]',
          archivedInMasterList && 'text-(--text-secondary) opacity-75',
          bill.muted && 'italic text-(--text-tertiary)',
          settledRowTextClass
        )}
      >
        {editingAmount ? (
          <input
            ref={amountInputRef}
            value={amountDraft}
            onChange={e => setAmountDraft(e.target.value)}
            onFocus={e => e.currentTarget.select()}
            onClick={e => e.currentTarget.select()}
            className={cn(
              'inline-currency-input w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 outline-none focus:border-(--navy)',
              settledRowTextClass
            )}
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
            className={cn('w-full rounded px-0', settledRowTextClass)}
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
          'bill-row-actions min-w-0 gap-0.5 transition-opacity',
          bill.muted || hovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {!templateArchivedRow ? (
          <>
            <button
              ref={colorAnchorRef}
              type="button"
              title="Row color"
              aria-label="Row color"
              className={cn(
                'size-3 shrink-0 rounded-full border border-border transition-opacity duration-150',
                hideSecondaryActions && 'pointer-events-none opacity-0',
                !hideSecondaryActions &&
                  (rowTint ? 'opacity-100' : 'bg-border/70 opacity-0 group-hover:opacity-100')
              )}
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
          </>
        ) : null}
        {templateArchivedRow ? (
          <>
            {onRestoreInMasterList ? (
              <ConfirmButton
                label="Restore"
                confirmLabel="Confirm restore?"
                title="Restore"
                aria-label="Restore"
                icon={<RotateCcw className="size-4" strokeWidth={2.25} />}
                confirmIcon={<Check className="size-4" strokeWidth={2.25} />}
                onConfirm={onRestoreInMasterList}
              />
            ) : null}
            {onRemoveFromTemplate ? (
              <ConfirmButton
                label="Remove"
                confirmLabel="Confirm remove?"
                title="Remove"
                aria-label="Remove from template"
                className="hover:text-(--danger)"
                icon={<Trash2 className="size-4" strokeWidth={2.25} />}
                confirmIcon={<Check className="size-4" strokeWidth={2.25} />}
                onConfirm={onRemoveFromTemplate}
              />
            ) : null}
          </>
        ) : (
          <>
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
            <ConfirmButton
              label="Remove"
              confirmLabel="Confirm remove?"
              title="Remove bill"
              aria-label="Remove bill"
              className={cn(
                'hover:text-(--danger)',
                hideSecondaryActions && 'pointer-events-none opacity-0'
              )}
              icon={<Trash2 className="size-4" strokeWidth={2.25} />}
              confirmIcon={<Check className="size-4" strokeWidth={2.25} />}
              onConfirm={onRemove}
            />
          </>
        )}
      </div>
    </div>
  )
}
