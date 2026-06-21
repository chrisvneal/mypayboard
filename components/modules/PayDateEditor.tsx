'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { payDateToIso } from '@/lib/pay-date'
import { isoToLocalDate, localDateToIso } from '@/lib/date-calendar'
import { useAnchorPopover } from '@/lib/use-anchor-popover'
import { useIsClient } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'

const POPOVER_WIDTH = 280
const POPOVER_EST_HEIGHT = 300

export type PayDateEditorProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  value: string
  onClose: () => void
  onCommit: (payDateIso: string) => void
  /** Set in template editor context to enable the "Rolls to next month" indicator. */
  templatePreviewMonth?: number
  templatePreviewYear?: number
}

export function PayDateEditor({
  open,
  anchorRef,
  value,
  onClose,
  onCommit,
  templatePreviewMonth,
  templatePreviewYear,
}: PayDateEditorProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const storedIsoRef = useRef('')
  const mounted = useIsClient()
  const position = useAnchorPopover(open, anchorRef, {
    width: POPOVER_WIDTH,
    estHeight: POPOVER_EST_HEIGHT,
  })

  useEffect(() => {
    storedIsoRef.current = payDateToIso(value)
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

  const isoValue = payDateToIso(value)
  const selectedDate = isoValue ? isoToLocalDate(isoValue) : undefined

  // Show "Rolls to next month" when in template context and the current date is one month ahead
  let rollsToNextMonth = false
  if (templatePreviewMonth !== undefined && templatePreviewYear !== undefined && isoValue) {
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(isoValue)
    if (iso) {
      const pickedYear = Number(iso[1])
      const pickedMonth = Number(iso[2])
      rollsToNextMonth =
        pickedYear > templatePreviewYear ||
        (pickedYear === templatePreviewYear && pickedMonth > templatePreviewMonth)
    }
  }

  const commitDate = (date: Date | undefined) => {
    if (!date) return
    const next = localDateToIso(date)
    if (!next || next === storedIsoRef.current) {
      onClose()
      return
    }
    storedIsoRef.current = next
    onCommit(next)
    onClose()
  }

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Pay date"
      className="fixed z-60 overflow-hidden rounded-lg border border-border bg-(--bg-primary) shadow-(--shadow-lg)"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <Calendar
        mode="single"
        selected={selectedDate}
        defaultMonth={selectedDate ?? new Date()}
        onSelect={commitDate}
      />
      {rollsToNextMonth && (
        <div className="border-t border-border px-3 py-2 text-[11px] text-(--text-tertiary)">
          Rolls to next month
        </div>
      )}
    </div>,
    document.body
  )
}
