'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ASAP_DUE_DATE,
  dueDateToIso,
  formatDueDateDisplay,
  isAsapDueDate,
} from '@/lib/due-date'
import { isoToLocalDate, localDateToIso } from '@/lib/date-calendar'
import { useAnchorPopover } from '@/lib/use-anchor-popover'
import { cn, useIsClient } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'

const POPOVER_WIDTH = 280
const POPOVER_EST_HEIGHT = 340
const MOUSE_LEAVE_CLOSE_DELAY_MS = 400

export type DueDateEditorProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  value: string
  boardMonth?: number
  boardYear: number
  onClose: () => void
  /** Always represents one full logical change — dueDate together with the
   *  dueNextMonth it now implies — as a single call, never split into two. */
  onCommit: (changes: { dueDate: string; dueNextMonth: boolean }) => void
  /** Recurring "*\/N" day pattern only — whether it resolves to next month. */
  dueNextMonth?: boolean
  /** Omit to hide the "Due next month" toggle entirely (e.g. master-list forms,
   *  which have no card/template month to be ambiguous against). */
  onNextMonthChange?: (value: boolean) => void
  /** Template editor: `boardMonth`/`boardYear` here are only
   *  `templatePreviewMonthYear()`'s display-only reference (today's real
   *  date), not a genuine fixed board — the year-boundary navigation bound
   *  below is meaningless (and actively wrong) against it, so it's skipped
   *  entirely in this mode. Template bill due dates are day-of-month
   *  patterns anyway, not explicit calendar dates tied to a real month. */
  dayOnly?: boolean
}

export function DueDateEditor({
  open,
  anchorRef,
  value,
  boardMonth,
  boardYear,
  onClose,
  onCommit,
  dueNextMonth = false,
  onNextMonthChange,
  dayOnly = false,
}: DueDateEditorProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const storedValueRef = useRef('')
  const mounted = useIsClient()
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const position = useAnchorPopover(open, anchorRef, popoverRef, {
    estWidth: POPOVER_WIDTH,
    estHeight: POPOVER_EST_HEIGHT,
  })

  useEffect(() => {
    storedValueRef.current = value
  }, [value])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorRef, onClose, open])

  useEffect(() => {
    if (!open && closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const scheduleClose = () => {
    closeTimeoutRef.current = setTimeout(onClose, MOUSE_LEAVE_CLOSE_DELAY_MS)
  }

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  if (!open || !mounted) return null

  const asapSelected = isAsapDueDate(value)
  const isoValue = dueDateToIso(value, boardYear, boardMonth, dueNextMonth)
  const selectedDate = isoValue ? isoToLocalDate(isoValue) : undefined
  const isRecurringPattern = /^\*\/(\d{1,2})$/.test(value.trim())

  // Explicit calendar dates store as M/D text with no year (see dueDateToIso) —
  // picking a date far enough from the board's own month makes the year
  // ambiguous on reload without help reconstructing it. dueDateToIso now
  // infers the year by nearest-month distance, which is only unambiguous
  // within half a year either way — so the picker is bounded to the board's
  // month ± MONTH_WINDOW to stay safely inside that range while covering
  // realistic "due a few months out" cases.
  //
  // Only applies outside dayOnly (template) mode — see the prop doc above
  // for why boardMonth/boardYear aren't a real board to bound against there.
  const MONTH_WINDOW = 3
  const effectiveMonth = boardMonth ?? 1
  const rangeStart = dayOnly ? undefined : new Date(boardYear, effectiveMonth - 1 - MONTH_WINDOW, 1)
  const rangeEnd = dayOnly ? undefined : new Date(boardYear, effectiveMonth + MONTH_WINDOW, 0)

  const commitAsap = () => {
    if (storedValueRef.current === ASAP_DUE_DATE) {
      onClose()
      return
    }
    storedValueRef.current = ASAP_DUE_DATE
    // Single combined write — dueNextMonth always resets to false alongside
    // the date here (was previously two separate onUpdate calls, racing as
    // two independent full-row PATCH requests with no ordering guarantee;
    // whichever was captured first — before the date change — could land
    // second and silently overwrite it).
    onCommit({ dueDate: ASAP_DUE_DATE, dueNextMonth: false })
    onClose()
  }

  const commitDate = (date: Date | undefined) => {
    if (!date) return
    const iso = localDateToIso(date)
    const next = formatDueDateDisplay(iso, boardMonth)
    if (!next || (next === storedValueRef.current && !dueNextMonth)) {
      onClose()
      return
    }
    storedValueRef.current = next
    // Picking an explicit calendar date resolves the ambiguity outright, so
    // dueNextMonth resets to false — combined into the same write as the
    // date itself (see commitAsap's comment for why these can't be two
    // separate calls).
    onCommit({ dueDate: next, dueNextMonth: false })
    onClose()
  }

  const optionClass = (selected: boolean) =>
    cn(
      'rounded-md transition-colors duration-150',
      selected
        ? 'bg-(--bg-tertiary) text-(--text-primary)'
        : 'text-(--text-tertiary) hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_55%,transparent)] hover:text-(--text-secondary)'
    )

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Due date"
      className="fixed z-60 w-fit overflow-hidden rounded-lg border border-border bg-(--bg-primary) shadow-(--shadow-lg)"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? -10000,
        visibility: position ? 'visible' : 'hidden',
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseEnter={cancelScheduledClose}
      onMouseLeave={scheduleClose}
    >
      <div className="border-b border-border px-2 py-1.5">
        <button
          type="button"
          className={cn(
            'w-full rounded-md px-2 py-1.5 text-left text-[12px] font-medium tracking-wide',
            optionClass(asapSelected)
          )}
          onClick={commitAsap}
        >
          ASAP
        </button>
      </div>
      <Calendar
        className="mx-auto"
        mode="single"
        selected={asapSelected ? undefined : selectedDate}
        defaultMonth={selectedDate ?? new Date(boardYear, (boardMonth ?? 1) - 1, 1)}
        startMonth={rangeStart}
        endMonth={rangeEnd}
        disabled={rangeStart && rangeEnd ? { before: rangeStart, after: rangeEnd } : undefined}
        onSelect={commitDate}
      />
      {onNextMonthChange && !asapSelected && isRecurringPattern && (
        <label className="flex cursor-pointer items-center gap-2 border-t border-border px-3 py-2 text-[12px] font-medium text-(--text-secondary) transition-colors duration-150 hover:bg-(--bg-secondary)">
          <input
            type="checkbox"
            checked={dueNextMonth}
            onChange={e => onNextMonthChange(e.target.checked)}
            className="size-3.5 accent-(--navy)"
          />
          Due next month
        </label>
      )}
    </div>,
    document.body
  )
}
