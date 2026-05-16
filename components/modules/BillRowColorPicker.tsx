'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

export const BILL_ROW_SWATCHES = [
  { label: 'White', value: '#FFFFFF', clear: true },
  { label: 'Cream', value: '#FFF8E7', clear: false },
  { label: 'Light blue', value: '#E6F1FB', clear: false },
  { label: 'Light green', value: '#E8F7EE', clear: false },
  { label: 'Light amber', value: '#FEF3C7', clear: false },
  { label: 'Light pink', value: '#FDE8EF', clear: false },
  { label: 'Light purple', value: '#F3E8FF', clear: false },
] as const

type BillRowColorPickerProps = {
  open: boolean
  onClose: () => void
  onPick: (hex: string | undefined) => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function BillRowColorPicker({ open, onClose, onPick, anchorRef }: BillRowColorPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

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

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Row color"
      className="absolute left-0 top-full z-50 mt-1 flex gap-1.5 rounded-lg border border-border bg-[var(--bg-primary)] p-2 shadow-md"
    >
      {BILL_ROW_SWATCHES.map(sw => (
        <button
          key={sw.value}
          type="button"
          title={sw.label}
          className={cn(
            'size-7 shrink-0 rounded-full border border-[var(--border-strong)] shadow-sm transition-transform hover:scale-105',
            sw.clear && 'bg-white'
          )}
          style={!sw.clear ? { backgroundColor: sw.value } : undefined}
          onClick={() => {
            onPick(sw.clear ? undefined : sw.value)
            onClose()
          }}
        />
      ))}
    </div>
  )
}
