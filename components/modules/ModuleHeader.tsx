'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import type { PayDateModule } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  HEADER_COLOR_SWATCHES,
  NEUTRAL_HEADER_COLOR,
  isNeutralHeaderColor,
  resolveHeaderVisual,
} from './header-colors'
import { PayDateEditor } from './PayDateEditor'

const PRIMARY_MENU_ITEMS = [
  { action: 'edit-pay-date', label: 'Edit pay date' },
  { action: 'edit-pay-amount', label: 'Edit pay amount' },
  { action: 'edit-header-color', label: 'Header color' },
] as const

const UTILITY_MENU_ITEMS = [
  { action: 'duplicate-module', label: 'Duplicate module' },
  { action: 'remove-module', label: 'Remove module', destructive: true },
] as const

const MENU_MIN_WIDTH = 200
const MENU_GAP = 4
const VIEWPORT_PADDING = 8
const MENU_EST_HEIGHT = 168
const MENU_EST_HEIGHT_WITH_COLORS = 280

type MenuPosition = {
  top: number
  left: number
}

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function useMenuPosition(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  colorOpen: boolean
) {
  const [position, setPosition] = useState<MenuPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) return

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const menuWidth = MENU_MIN_WIDTH
      const menuHeight = colorOpen ? MENU_EST_HEIGHT_WITH_COLORS : MENU_EST_HEIGHT

      let left = rect.right - menuWidth
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PADDING)
      )

      let top = rect.bottom + MENU_GAP
      if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
        top = rect.top - menuHeight - MENU_GAP
      }
      top = Math.max(
        VIEWPORT_PADDING,
        Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING)
      )

      setPosition({ top, left })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, colorOpen, anchorRef])

  return open ? position : null
}

export type ModuleHeaderProps = {
  module: PayDateModule
  ownerName: string
  onPayAmountChange: (amount: number) => void
  onPayDateChange: (payDate: string) => void
  onMenuAction: (action: string) => void
  highlightDrop?: boolean
}

export function ModuleHeader({
  module,
  ownerName,
  onPayAmountChange,
  onPayDateChange,
  onMenuAction,
  highlightDrop,
}: ModuleHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [payDateEditorOpen, setPayDateEditorOpen] = useState(false)
  const [editingPayAmount, setEditingPayAmount] = useState(false)
  const [payAmountDraft, setPayAmountDraft] = useState(formatCurrency(module.payAmount ?? 0))
  const menuRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const payDateAnchorRef = useRef<HTMLButtonElement>(null)
  const payAmountInputRef = useRef<HTMLInputElement>(null)

  const menuPosition = useMenuPosition(menuOpen, menuBtnRef, colorOpen)

  const initials = ownerName.trim().charAt(0).toUpperCase() || '?'
  const visual = resolveHeaderVisual({
    headerColor: module.headerColor,
    ownerId: module.owner,
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

  const menuPanel =
    menuOpen && menuPosition ? (
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-(--bg-primary) py-1 shadow-lg"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {PRIMARY_MENU_ITEMS.map(item => (
          <button
            key={item.action}
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-[13px] text-(--text-primary) transition-colors duration-150 ease-out hover:bg-(--bg-tertiary)"
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
              if (item.action === 'edit-pay-date') {
                setMenuOpen(false)
                setColorOpen(false)
                setPayDateEditorOpen(true)
              }
            }}
          >
            {item.label}
          </button>
        ))}
        {colorOpen && (
          <div className="px-2 pb-2 pt-1">
            <p className="section-label mb-3 px-1 pt-1">Header color</p>
            <div className="flex flex-wrap gap-1.5 px-1">
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
        <div className="module-menu-divider" role="separator" />
        {UTILITY_MENU_ITEMS.map(item => (
          <button
            key={item.action}
            type="button"
            role="menuitem"
            className={cn(
              'flex w-full px-3 py-2 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-tertiary)',
              item.action === 'remove-module'
                ? 'text-(--danger-muted) hover:text-(--danger)'
                : 'text-(--text-primary)'
            )}
            onClick={() => {
              setMenuOpen(false)
              setColorOpen(false)
              onMenuAction(item.action)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    ) : null

  return (
    <div
      style={{
        backgroundColor: visual.bg,
        transition: 'background-color 150ms ease',
      }}
      className="module-header-bar relative flex items-start justify-between gap-4 px-5 pt-4 pb-3"
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
            <span>{module.source} - </span>
            <button
              ref={payDateAnchorRef}
              type="button"
              className="rounded-sm transition-colors duration-150 ease-out hover:underline"
              style={{ color: visual.title }}
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(false)
                setColorOpen(false)
                setPayDateEditorOpen(true)
              }}
            >
              {formatDate(module.payDate)}
            </button>
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
              className="balance-display w-full rounded px-0 text-right text-[22px] transition-colors duration-150 hover:bg-black/4 dark:hover:bg-white/4"
              style={{ color: hasPayAmount ? visual.title : visual.caption }}
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
            className="rounded-md p-1 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: visual.menu }}
            onClick={e => {
              e.stopPropagation()
              setMenuOpen(o => !o)
              setColorOpen(false)
            }}
          >
            <MoreVertical className="size-4" aria-hidden />
          </button>

          {menuPanel && createPortal(menuPanel, document.body)}

          <PayDateEditor
            open={payDateEditorOpen}
            anchorRef={payDateAnchorRef}
            value={module.payDate}
            onClose={() => setPayDateEditorOpen(false)}
            onCommit={onPayDateChange}
          />
        </div>
      </div>
    </div>
  )
}
