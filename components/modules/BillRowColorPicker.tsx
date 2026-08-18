'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAnchorPopover } from '@/lib/use-anchor-popover'
import { cn, useIsClient } from '@/lib/utils'

const POPOVER_WIDTH = 260
const POPOVER_EST_HEIGHT = 56

export const BILL_ROW_SWATCHES = [
  { label: 'White', value: '#FFFFFF', clear: true },
  { label: 'Cream', value: '#FFF8E7', clear: false },
  { label: 'Light blue', value: '#E6F1FB', clear: false },
  { label: 'Light green', value: '#E8F7EE', clear: false },
  { label: 'Light amber', value: '#FEF3C7', clear: false },
  { label: 'Light pink', value: '#FDE8EF', clear: false },
  { label: 'Light purple', value: '#F3E8FF', clear: false },
] as const

/**
 * Richer companion tone per swatch, for the row-highlight "pipe" accent only.
 * The swatches above are near-white pastels — great for a whole-row wash, but
 * they're already so low-saturation that darkening them (e.g. color-mix with
 * black) just scales every channel down proportionally and still reads as
 * gray. These are hand-picked instead, so the hue itself stays legible at a
 * 4px width.
 */
export const BILL_ROW_PIPE_ACCENTS: Record<string, string> = {
  '#FFF8E7': '#D8B25C', // Cream
  '#E6F1FB': '#6BA8D9', // Light blue
  '#E8F7EE': '#6CC99A', // Light green
  '#FEF3C7': '#E0B23D', // Light amber
  '#FDE8EF': '#E08AAF', // Light pink
  '#F3E8FF': '#A87EDB', // Light purple
}

type BillRowColorPickerProps = {
  open: boolean
  onClose: () => void
  onPick: (hex: string | undefined) => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function BillRowColorPicker({ open, onClose, onPick, anchorRef }: BillRowColorPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const mounted = useIsClient()
  const position = useAnchorPopover(open, anchorRef, popoverRef, {
    estWidth: POPOVER_WIDTH,
    estHeight: POPOVER_EST_HEIGHT,
  })

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const el = popoverRef.current
      const anchor = anchorRef.current
      const target = e.target as Node
      if (el?.contains(target) || anchor?.contains(target)) return
      onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [anchorRef, onClose, open])

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Row color"
      className="fixed z-60 flex w-fit gap-1.5 rounded-lg border border-border bg-(--bg-primary) p-2 shadow-md"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? -10000,
        visibility: position ? 'visible' : 'hidden',
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      {BILL_ROW_SWATCHES.map(sw => (
        <button
          key={sw.value}
          type="button"
          title={sw.label}
          aria-label={sw.label}
          className={cn(
            'size-7 shrink-0 rounded-full border border-(--border-strong) shadow-sm transition-transform hover:scale-105',
            sw.clear && 'bg-white'
          )}
          style={!sw.clear ? { backgroundColor: sw.value } : undefined}
          onClick={() => {
            onPick(sw.clear ? undefined : sw.value)
            onClose()
          }}
        />
      ))}
    </div>,
    document.body
  )
}
