'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import type { PayDateModule, User } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  HEADER_COLOR_SWATCHES,
  NEUTRAL_HEADER_COLOR,
  isNeutralHeaderColor,
  resolveHeaderVisual,
} from './header-colors'

const PRIMARY_MENU_ITEMS = [
  { action: 'edit-header', label: 'Edit header' },
  { action: 'edit-header-color', label: 'Header color' },
] as const

const UTILITY_MENU_ITEMS = [
  { action: 'duplicate-module', label: 'Duplicate card' },
  { action: 'remove-module', label: 'Remove card', destructive: true },
] as const

const MENU_MIN_WIDTH = 200
const MENU_GAP = 4
const VIEWPORT_PADDING = 8
const MENU_EST_HEIGHT = 140
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

function toIsoDate(value: string): string {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim())
  if (iso) {
    const y = iso[1]
    const m = String(Number(iso[2])).padStart(2, '0')
    const d = String(Number(iso[3])).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  /** Effective header color (personal override or shared/owner default). */
  headerColor?: string
  ownerName: string
  users: User[]
  incomeSources: string[]
  onOwnerChange: (ownerId: string) => void
  onSourceChange: (source: string) => void
  onPayAmountChange: (amount: number) => void
  onPayDateChange: (payDate: string) => void
  onMenuAction: (action: string) => void
  highlightDrop?: boolean
}

export function ModuleHeader({
  module,
  headerColor,
  ownerName,
  users,
  incomeSources,
  onOwnerChange,
  onSourceChange,
  onPayAmountChange,
  onPayDateChange,
  onMenuAction,
  highlightDrop,
}: ModuleHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [headerEditorOpen, setHeaderEditorOpen] = useState(false)
  const [ownerDraft, setOwnerDraft] = useState(module.owner)
  const [sourceDraft, setSourceDraft] = useState(module.source)
  const [payDateDraft, setPayDateDraft] = useState(toIsoDate(module.payDate))
  const [payAmountDraft, setPayAmountDraft] = useState(String(module.payAmount ?? 0))
  const menuRef = useRef<HTMLDivElement>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  const menuPosition = useMenuPosition(menuOpen, menuBtnRef, colorOpen)

  const initials = ownerName.trim().charAt(0).toUpperCase() || '?'
  const visual = resolveHeaderVisual({
    headerColor,
    ownerId: module.owner,
    highlightDrop,
  })
  const payAmount = module.payAmount ?? 0
  const hasPayAmount = module.payAmount !== null && module.payAmount !== undefined

  useEffect(() => {
    if (headerEditorOpen) return
    setOwnerDraft(module.owner)
    setSourceDraft(module.source)
    setPayDateDraft(toIsoDate(module.payDate))
    setPayAmountDraft(String(module.payAmount ?? 0))
  }, [headerEditorOpen, module.owner, module.source, module.payDate, module.payAmount])

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

  const saveHeader = () => {
    if (ownerDraft !== module.owner) onOwnerChange(ownerDraft)
    if (sourceDraft.trim() !== module.source) onSourceChange(sourceDraft.trim())
    if (payDateDraft && payDateDraft !== toIsoDate(module.payDate)) onPayDateChange(payDateDraft)
    const nextAmount = parseMoneyInput(payAmountDraft)
    if (nextAmount !== null && nextAmount !== payAmount) onPayAmountChange(nextAmount)
    setHeaderEditorOpen(false)
  }

  const cancelHeaderEdit = () => {
    setOwnerDraft(module.owner)
    setSourceDraft(module.source)
    setPayDateDraft(toIsoDate(module.payDate))
    setPayAmountDraft(String(module.payAmount ?? 0))
    setHeaderEditorOpen(false)
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
              if (item.action === 'edit-header') {
                setMenuOpen(false)
                setColorOpen(false)
                setHeaderEditorOpen(true)
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
                  isNeutralHeaderColor(headerColor) &&
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
                    headerColor?.toUpperCase() === sw.value.toUpperCase() &&
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
      // No background-color transition: the theme class swaps synchronously, so
      // the header must cut to its new color instantly rather than fade/flash.
      style={{ backgroundColor: visual.bg }}
      className="module-header-bar relative px-5 pt-4 pb-3"
    >
      <div className="flex items-start justify-between gap-4">
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
              <span>{formatDate(module.payDate)}</span>
            </div>
            <div className="truncate text-[13px] leading-snug" style={{ color: visual.subtitle }}>
              {ownerName}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-start">
          <div className="module-financial-rail shrink-0">
            <div
              className="balance-display w-full px-0 text-right text-[22px]"
              style={{ color: hasPayAmount ? visual.title : visual.caption }}
            >
              {formatCurrency(payAmount)}
            </div>
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
          </div>
        </div>
      </div>
      <div
        className={cn(
          'grid w-full transition-[grid-template-rows,opacity] duration-200 ease-out',
          headerEditorOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="mx-1 mt-2 rounded-lg border border-black/8 bg-black/4 p-3 dark:border-white/10 dark:bg-white/4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: visual.caption }}>
              Edit Header
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[11px]">
                <span className="mb-1 block" style={{ color: visual.caption }}>
                  Assigned User
                </span>
                <select
                  value={ownerDraft}
                  onChange={e => setOwnerDraft(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-(--bg-primary) px-2 text-[12px] text-(--text-primary) outline-none focus:border-(--navy)"
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px]">
                <span className="mb-1 block" style={{ color: visual.caption }}>
                  Income Source
                </span>
                <select
                  value={sourceDraft}
                  onChange={e => setSourceDraft(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-(--bg-primary) px-2 text-[12px] text-(--text-primary) outline-none focus:border-(--navy)"
                >
                  {sourceDraft.trim() === '' ? <option value="">Select source</option> : null}
                  {[...new Set([module.source, ...incomeSources].filter(Boolean))].map(source => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px]">
                <span className="mb-1 block" style={{ color: visual.caption }}>
                  Pay Date
                </span>
                <input
                  type="date"
                  value={payDateDraft}
                  onChange={e => setPayDateDraft(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-(--bg-primary) px-2 text-[12px] text-(--text-primary) outline-none focus:border-(--navy)"
                />
              </label>
              <label className="text-[11px]">
                <span className="mb-1 block" style={{ color: visual.caption }}>
                  Pay Amount
                </span>
                <input
                  value={payAmountDraft}
                  onChange={e => setPayAmountDraft(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-(--bg-primary) px-2 text-[12px] text-(--text-primary) outline-none focus:border-(--navy)"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelHeaderEdit}
                className="inline-flex h-7 items-center rounded-md border border-border bg-(--bg-primary) px-2.5 text-[12px] text-(--text-secondary) hover:bg-(--bg-tertiary)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveHeader}
                className="inline-flex h-7 items-center rounded-md bg-(--navy) px-2.5 text-[12px] font-semibold text-white hover:bg-(--navy-dark)"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
