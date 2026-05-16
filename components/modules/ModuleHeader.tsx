'use client'

import { useEffect, useRef, useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { MoreVertical } from 'lucide-react'
import type { PayDateModule } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import { BILL_ROW_SWATCHES } from './BillRowColorPicker'
import { balanceToneClass, getRemainingTone } from './balance-tone'

const MENU_ITEMS = [
  { action: 'edit-pay-date', label: 'Edit pay date' },
  { action: 'edit-pay-amount', label: 'Edit pay amount' },
  { action: 'edit-header-color', label: 'Edit header color' },
  { action: 'duplicate-module', label: 'Duplicate module' },
  { action: 'move-column', label: 'Move to other column' },
  { action: 'remove-module', label: 'Remove module' },
] as const

function defaultHeaderVisual(ownerId: string): { bg: string; fg: string } {
  if (ownerId === 'user-chris') return { bg: '#E6F1FB', fg: '#185FA5' }
  if (ownerId === 'user-nicole') return { bg: '#E8F7EE', fg: '#2a7a47' }
  return { bg: '#F1F5F9', fg: '#475569' }
}

export type ModuleHeaderProps = {
  module: PayDateModule
  ownerName: string
  remaining: number
  allPaid: boolean
  onMenuAction: (action: string) => void
  dragAttributes: DraggableAttributes
  dragListeners: DraggableSyntheticListeners | undefined
}

export function ModuleHeader({
  module,
  ownerName,
  remaining,
  allPaid,
  onMenuAction,
  dragAttributes,
  dragListeners,
}: ModuleHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  const tone = getRemainingTone(remaining)
  const initials = ownerName.trim().charAt(0).toUpperCase() || '?'
  const defaults = defaultHeaderVisual(module.owner)
  const headerBg = module.headerColor ?? defaults.bg
  const avatarFg = defaults.fg

  useEffect(() => {
    if (!menuOpen && !colorOpen) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const m = menuRef.current
      const b = menuBtnRef.current
      const target = e.target as Node
      if (m?.contains(target) || b?.contains(target)) return
      setMenuOpen(false)
      setColorOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [colorOpen, menuOpen])

  return (
    <div
      {...dragAttributes}
      {...(dragListeners ?? {})}
      style={{
        backgroundColor: allPaid ? '#E8F7EE' : headerBg,
        transition: 'background 0.4s ease',
      }}
      className={cn(
        'relative flex cursor-grab items-start justify-between gap-3 px-3 py-2.5 active:cursor-grabbing'
      )}
    >
      <div className="flex min-w-0 flex-1 gap-2.5">
        <div
          className="avatar flex size-[30px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{
            backgroundColor: module.headerColor ?? defaults.bg,
            color: avatarFg,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-[var(--text-primary)]">{ownerName}</div>
          <div className="truncate text-[13px] text-[var(--text-secondary)]">{module.source}</div>
          <div className="text-[12px] text-[var(--text-tertiary)]">{formatDate(module.payDate)}</div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 pr-7">
        <span className="text-[11px] font-medium tracking-wide text-[var(--text-tertiary)]">
          Remaining
        </span>
        <span
          className={cn('balance-display tabular-nums', balanceToneClass(tone))}
        >
          {formatCurrency(remaining)}
        </span>
      </div>

      <div className="absolute right-2 top-2">
        <button
          ref={menuBtnRef}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation()
            setMenuOpen(o => !o)
            setColorOpen(false)
          }}
        >
          <MoreVertical className="size-4" aria-hidden />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-[var(--bg-primary)] py-1 shadow-lg"
            onPointerDown={e => e.stopPropagation()}
          >
            {MENU_ITEMS.map(item => (
              <button
                key={item.action}
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-2 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                onClick={() => {
                  if (item.action === 'edit-header-color') {
                    setColorOpen(o => !o)
                    return
                  }
                  setMenuOpen(false)
                  onMenuAction(item.action)
                }}
              >
                {item.label}
              </button>
            ))}
            {colorOpen && (
              <div className="border-t border-border px-2 py-2">
                <p className="section-label mb-2 px-1">Header color</p>
                <div className="flex flex-wrap gap-1.5">
                  {BILL_ROW_SWATCHES.map(sw => (
                    <button
                      key={`hdr-${sw.value}`}
                      type="button"
                      title={sw.label}
                      className={cn(
                        'size-7 shrink-0 rounded-full border border-[var(--border-strong)] shadow-sm transition-transform hover:scale-105',
                        sw.clear && 'bg-white'
                      )}
                      style={!sw.clear ? { backgroundColor: sw.value } : undefined}
                      onClick={() => {
                        onMenuAction(sw.clear ? 'set-header-color-clear' : `set-header-color:${sw.value}`)
                        setColorOpen(false)
                        setMenuOpen(false)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
