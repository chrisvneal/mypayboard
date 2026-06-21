'use client'

import { useEffect, useRef } from 'react'
import { ICON_MAP, ICON_KEYS, type IconKey } from '@/lib/icons'
import { cn } from '@/lib/utils'

type IconPickerProps = {
  selected: IconKey
  onSelect: (key: IconKey) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

export function IconPicker({ selected, onSelect, onClose, anchorRef }: IconPickerProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) {
        return
      }
      onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef])

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Choose icon"
      className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-2 shadow-lg"
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
    </div>
  )
}
