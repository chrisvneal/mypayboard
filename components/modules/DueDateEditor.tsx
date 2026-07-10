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

export type DueDateEditorProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  value: string
  boardMonth?: number
  boardYear: number
  onClose: () => void
  onCommit: (dueDate: string) => void
}

export function DueDateEditor({
  open,
  anchorRef,
  value,
  boardMonth,
  boardYear,
  onClose,
  onCommit,
}: DueDateEditorProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const storedValueRef = useRef('')
  const mounted = useIsClient()
  const position = useAnchorPopover(open, anchorRef, {
    width: POPOVER_WIDTH,
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

  if (!open || !mounted || !position) return null

  const asapSelected = isAsapDueDate(value)
  const isoValue = dueDateToIso(value, boardYear, boardMonth)
  const selectedDate = isoValue ? isoToLocalDate(isoValue) : undefined

  const commitAsap = () => {
    if (storedValueRef.current === ASAP_DUE_DATE) {
      onClose()
      return
    }
    storedValueRef.current = ASAP_DUE_DATE
    onCommit(ASAP_DUE_DATE)
    onClose()
  }

  const commitDate = (date: Date | undefined) => {
    if (!date) return
    const iso = localDateToIso(date)
    const next = formatDueDateDisplay(iso, boardMonth)
    if (!next || next === storedValueRef.current) {
      onClose()
      return
    }
    storedValueRef.current = next
    onCommit(next)
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
      className="fixed z-60 overflow-hidden rounded-lg border border-border bg-(--bg-primary) shadow-(--shadow-lg)"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseLeave={onClose}
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
        mode="single"
        selected={asapSelected ? undefined : selectedDate}
        defaultMonth={selectedDate ?? new Date(boardYear, (boardMonth ?? 1) - 1, 1)}
        onSelect={commitDate}
      />
    </div>,
    document.body
  )
}
