'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ASAP_DUE_DATE,
  dueDateToIso,
  formatDueDateDisplay,
  isAsapDueDate,
} from '@/lib/due-date'
import { cn } from '@/lib/utils'

const POPOVER_MIN_WIDTH = 136
const POPOVER_EST_HEIGHT = 108
const GAP = 4

type AnchorPosition = {
  top: number
  left: number
  width: number
}

export type DueDateEditorProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  value: string
  boardMonth?: number
  boardYear: number
  onClose: () => void
  onCommit: (dueDate: string) => void
}

function useAnchorPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<AnchorPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const width = Math.max(rect.width, POPOVER_MIN_WIDTH)
      let left = rect.left
      let top = rect.bottom + GAP

      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8)
      }
      if (top + POPOVER_EST_HEIGHT > window.innerHeight - 8) {
        top = Math.max(8, rect.top - POPOVER_EST_HEIGHT - GAP)
      }

      setPosition({ top, left, width })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, anchorRef])

  return position
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
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [isoDraft, setIsoDraft] = useState('')
  const [mounted, setMounted] = useState(false)
  const position = useAnchorPosition(open, anchorRef)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setIsoDraft(dueDateToIso(value, boardYear, boardMonth))
  }, [open, value, boardYear, boardMonth])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const el = popoverRef.current
      const anchor = anchorRef.current
      const target = e.target as Node
      if (el?.contains(target) || anchor?.contains(target)) return
      // Native date-picker UI renders outside the popover; keep open while it is active.
      if (dateInputRef.current === document.activeElement) return
      onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorRef, onClose, open])

  if (!open || !mounted || !position) return null

  const asapSelected = isAsapDueDate(value)
  const dateSelected = !asapSelected && Boolean(value)

  const commitAsap = () => {
    onCommit(ASAP_DUE_DATE)
    onClose()
  }

  const applyDate = () => {
    if (!isoDraft) return
    const next = formatDueDateDisplay(isoDraft, boardMonth)
    if (next && next !== value) onCommit(next)
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
      className="fixed z-60 rounded-lg border border-border bg-(--bg-primary) p-1.5 shadow-md"
      style={{
        top: position.top,
        left: position.left,
        minWidth: position.width,
        width: position.width,
      }}
    >
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          className={cn(
            'w-full px-2 py-1 text-left text-[12px] font-medium tracking-wide',
            optionClass(asapSelected)
          )}
          onClick={commitAsap}
        >
          ASAP
        </button>
        <div className={cn('px-1.5 py-1', optionClass(dateSelected))}>
          <span className="mb-0.5 block text-[10px] font-medium tracking-wide text-(--text-tertiary)">
            Date
          </span>
          <input
            ref={dateInputRef}
            type="date"
            value={isoDraft}
            onChange={e => setIsoDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyDate()
              }
            }}
            className="h-7 w-full rounded border border-border/80 bg-(--bg-primary) px-1.5 text-[12px] outline-none focus:border-(--navy)"
          />
          <button
            type="button"
            disabled={!isoDraft}
            className="mt-1 w-full rounded px-1 py-0.5 text-[11px] font-medium text-(--navy) transition-colors duration-150 hover:underline disabled:pointer-events-none disabled:opacity-40"
            onClick={applyDate}
          >
            Set date
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
