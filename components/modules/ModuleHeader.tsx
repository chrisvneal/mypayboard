'use client'

import { useEffect, useRef, useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { MoreVertical } from 'lucide-react'
import type { PayDateModule } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'
import {
  HEADER_COLOR_SWATCHES,
  NEUTRAL_HEADER_COLOR,
  isNeutralHeaderColor,
  resolveHeaderVisual,
} from './header-colors'

const MENU_ITEMS = [
  { action: 'edit-pay-date', label: 'Edit pay date' },
  { action: 'edit-pay-amount', label: 'Edit pay amount' },
  { action: 'edit-header-color', label: 'Edit header color' },
  { action: 'duplicate-module', label: 'Duplicate module' },
  { action: 'move-column', label: 'Move to other column' },
  { action: 'remove-module', label: 'Remove module' },
] as const

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

export type ModuleHeaderProps = {
  module: PayDateModule
  ownerName: string
  allPaid: boolean
  onPayAmountChange: (amount: number) => void
  onMenuAction: (action: string) => void
  dragAttributes: DraggableAttributes
  dragListeners: DraggableSyntheticListeners | undefined
  highlightDrop?: boolean
}

export function ModuleHeader({
  module,
  ownerName,
  allPaid,
  onPayAmountChange,
  onMenuAction,
  dragAttributes,
  dragListeners,
  highlightDrop,
}: ModuleHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [editingPayAmount, setEditingPayAmount] = useState(false)
  const [payAmountDraft, setPayAmountDraft] = useState(formatCurrency(module.payAmount ?? 0))
  const menuRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const payAmountInputRef = useRef<HTMLInputElement>(null)

  const initials = ownerName.trim().charAt(0).toUpperCase() || '?'
  const visual = resolveHeaderVisual({
    headerColor: module.headerColor,
    ownerId: module.owner,
    allPaid,
    highlightDrop,
  })
  const payAmount = module.payAmount ?? 0
  const hasPayAmount = module.payAmount !== null && module.payAmount !== undefined

  const startPayAmountEdit = () => {
    setPayAmountDraft(formatCurrency(payAmount))
    setEditingPayAmount(true)
  }

  useEffect(() => {
    if (!editingPayAmount) return
    payAmountInputRef.current?.focus()
    requestAnimationFrame(() => payAmountInputRef.current?.select())
  }, [editingPayAmount])

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

  const savePayAmount = () => {
    const next = parseMoneyInput(payAmountDraft)
    if (next !== null && next !== payAmount) onPayAmountChange(next)
    else setPayAmountDraft(formatCurrency(payAmount))
    setEditingPayAmount(false)
  }

  return (
    <div
      {...dragAttributes}
      {...(dragListeners ?? {})}
      style={{
        backgroundColor: visual.bg,
        transition: 'background-color 150ms ease',
      }}
      className={cn(
        'module-header-bar relative flex cursor-grab items-start justify-between gap-4 px-5 pt-[18px] pb-5 active:cursor-grabbing'
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3.5">
        <div
          className="avatar mt-0.5 flex size-[30px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          style={{
            backgroundColor: visual.avatarBg,
            color: visual.avatarFg,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="truncate font-semibold leading-snug" style={{ color: visual.title }}>
            {module.source} - {formatDate(module.payDate)}
          </div>
          <div className="truncate text-[13px] leading-snug" style={{ color: visual.subtitle }}>
            {ownerName}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-start">
        <div className="module-financial-rail shrink-0">
          {editingPayAmount ? (
            <input
              ref={payAmountInputRef}
              value={payAmountDraft}
              onChange={e => setPayAmountDraft(e.target.value)}
              onFocus={e => e.currentTarget.select()}
              onClick={e => e.currentTarget.select()}
              className="balance-display w-full border-0 bg-transparent px-0 py-0 text-right text-[22px] outline-none"
              style={{ color: visual.title }}
              onPointerDown={e => e.stopPropagation()}
              onBlur={savePayAmount}
              onKeyDown={e => {
                if (e.key === 'Enter') savePayAmount()
                if (e.key === 'Escape') {
                  setPayAmountDraft(formatCurrency(payAmount))
                  setEditingPayAmount(false)
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="balance-display w-full rounded px-0 text-right text-[22px] transition-colors duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              style={{ color: hasPayAmount ? visual.title : visual.caption }}
              onPointerDown={e => e.stopPropagation()}
              onClick={startPayAmountEdit}
            >
              {formatCurrency(payAmount)}
            </button>
          )}
          <span className="section-label" style={{ color: visual.caption }}>
            My pay
          </span>
        </div>

        <div className="module-actions-cell module-header-actions relative flex justify-end pt-0.5">
          <button
            ref={menuBtnRef}
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="rounded-md p-1 transition-colors duration-150 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
            style={{ color: visual.menu }}
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
              className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-(--bg-primary) py-1 shadow-lg"
              onPointerDown={e => e.stopPropagation()}
            >
              {MENU_ITEMS.map(item => (
                <button
                  key={item.action}
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-[13px] text-(--text-primary) hover:bg-(--bg-tertiary)"
                  onClick={() => {
                    if (item.action === 'edit-header-color') {
                      setColorOpen(o => !o)
                      return
                    }
                    if (item.action === 'edit-pay-amount') {
                      setMenuOpen(false)
                      startPayAmountEdit()
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
                    <button
                      type="button"
                      title="Neutral"
                      aria-label="Neutral header"
                      className={cn(
                        'size-7 shrink-0 rounded-full border border-(--border-strong) bg-(--bg-secondary) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
                        isNeutralHeaderColor(module.headerColor) &&
                          'ring-2 ring-(--navy) ring-offset-1'
                      )}
                      onClick={() => {
                        onMenuAction(`set-header-color:${NEUTRAL_HEADER_COLOR}`)
                        setColorOpen(false)
                        setMenuOpen(false)
                      }}
                    />
                    {HEADER_COLOR_SWATCHES.map(sw => (
                      <button
                        key={`hdr-${sw.value}`}
                        type="button"
                        title={sw.label}
                        className={cn(
                          'size-7 shrink-0 rounded-full border border-(--border-strong) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
                          module.headerColor?.toUpperCase() === sw.value.toUpperCase() &&
                            'ring-2 ring-(--navy) ring-offset-1'
                        )}
                        style={{ backgroundColor: sw.value }}
                        onClick={() => {
                          onMenuAction(`set-header-color:${sw.value}`)
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
    </div>
  )
}
