'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { payDateToIso } from '@/lib/pay-date'
import { useIsClient } from '@/lib/utils'

const POPOVER_MIN_WIDTH = 136
const POPOVER_EST_HEIGHT = 44
const GAP = 4

type AnchorPosition = {
  top: number
  left: number
  width: number
}

export type PayDateEditorProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  value: string
  onClose: () => void
  onCommit: (payDateIso: string) => void
}

function useAnchorPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<AnchorPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) return

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

  return open ? position : null
}

export function PayDateEditor({
  open,
  anchorRef,
  value,
  onClose,
  onCommit,
}: PayDateEditorProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const storedIsoRef = useRef('')
  const pickerActiveRef = useRef(false)
  const [isoDraft, setIsoDraft] = useState('')
  const mounted = useIsClient()
  const position = useAnchorPosition(open, anchorRef)

  useEffect(() => {
    storedIsoRef.current = payDateToIso(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setIsoDraft(payDateToIso(value)))
  }, [open, value])

  useEffect(() => {
    if (!open || !position) return

    const input = dateInputRef.current
    if (!input) return

    requestAnimationFrame(() => input.focus())

    const handleNativeChange = () => {
      const next = input.value
      if (!next || next === storedIsoRef.current) return
      storedIsoRef.current = next
      setIsoDraft(next)
      pickerActiveRef.current = false
      onCommit(next)
      onClose()
    }

    const handleFocus = () => {
      pickerActiveRef.current = true
    }

    const handleBlur = () => {
      window.setTimeout(() => {
        if (document.activeElement !== input) {
          pickerActiveRef.current = false
        }
      }, 350)
    }

    input.addEventListener('change', handleNativeChange)
    input.addEventListener('focus', handleFocus)
    input.addEventListener('blur', handleBlur)

    return () => {
      input.removeEventListener('change', handleNativeChange)
      input.removeEventListener('focus', handleFocus)
      input.removeEventListener('blur', handleBlur)
    }
  }, [open, onClose, onCommit, position])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      if (pickerActiveRef.current || dateInputRef.current === document.activeElement) return
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

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Pay date"
      className="fixed z-60 rounded-lg border border-border bg-(--bg-primary) p-1.5 shadow-md"
      style={{
        top: position.top,
        left: position.left,
        minWidth: position.width,
        width: position.width,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <input
        ref={dateInputRef}
        type="date"
        value={isoDraft}
        onChange={e => setIsoDraft(e.target.value)}
        className="h-7 w-full rounded border border-border/80 bg-(--bg-primary) px-1.5 text-[12px] outline-none focus:border-(--navy)"
      />
    </div>,
    document.body
  )
}
