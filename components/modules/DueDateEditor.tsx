'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ASAP_DUE_DATE,
  dueDateToIso,
  formatDueDateDisplay,
  isAsapDueDate,
} from '@/lib/due-date'
import { cn } from '@/lib/utils'

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
  const [isoDraft, setIsoDraft] = useState('')

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

  if (!open) return null

  const commitAsap = () => {
    if (!isAsapDueDate(value)) onCommit(ASAP_DUE_DATE)
    onClose()
  }

  const commitIso = (iso: string) => {
    if (!iso) return
    const next = formatDueDateDisplay(iso, boardMonth)
    if (next && next !== value) onCommit(next)
    onClose()
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Due date"
      className="absolute right-0 top-full z-50 mt-1 w-[148px] rounded-lg border border-border bg-(--bg-primary) p-2 shadow-md"
    >
      <button
        type="button"
        className={cn(
          'w-full rounded-md px-2 py-1.5 text-left text-[12px] font-medium tracking-wide transition-colors duration-150',
          isAsapDueDate(value)
            ? 'bg-(--bg-tertiary) text-(--text-primary)'
            : 'text-(--text-tertiary) hover:bg-(--bg-tertiary) hover:text-(--text-secondary)'
        )}
        onClick={commitAsap}
      >
        ASAP
      </button>
      <label className="mt-2 block">
        <span className="mb-1 block text-[10px] font-medium tracking-wide text-(--text-tertiary)">
          Date
        </span>
        <input
          type="date"
          value={isoDraft}
          onChange={e => {
            setIsoDraft(e.target.value)
            commitIso(e.target.value)
          }}
          className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-[12px] outline-none focus:border-(--navy)"
        />
      </label>
    </div>
  )
}
