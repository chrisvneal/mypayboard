'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ICON_MAP, ICON_KEYS, type IconKey } from '@/lib/icons'
import { cn } from '@/lib/utils'

type IconPickerProps = {
  selected: IconKey
  onSelect: (key: IconKey) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

const PICKER_W = 256  // matches w-64

export function IconPicker({ selected, onSelect, onClose, anchorRef }: IconPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Position relative to anchor after DOM commit, before paint — no position flash.
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const pickerH = popoverRef.current?.offsetHeight || 192
    const spaceBelow = window.innerHeight - r.bottom - 8
    const top = spaceBelow >= pickerH ? r.bottom + 8 : Math.max(8, r.top - pickerH - 8)
    const left = Math.min(r.left, window.innerWidth - PICKER_W - 8)
    setPos({ top: Math.max(8, top), left: Math.max(8, left) })
  }, [anchorRef])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) return
      onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    // Close if the user scrolls (anchor may leave viewport)
    function handleScroll() { onClose() }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, anchorRef])

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Choose icon"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="z-9999 w-64 rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-2 shadow-lg"
    >
      <div className="grid grid-cols-6 gap-1">
        {ICON_KEYS.map((key) => {
          const { Icon, label } = ICON_MAP[key]
          const isSelected = key === selected
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => {
                onSelect(key)
                onClose()
              }}
              className={cn(
                'flex size-9 items-center justify-center rounded-full transition-colors',
                isSelected
                  ? 'bg-(--navy-light) ring-2 ring-(--navy)'
                  : 'hover:bg-(--bg-secondary)'
              )}
            >
              <Icon className="size-4 text-(--text-primary)" />
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
}
