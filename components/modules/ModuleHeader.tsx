'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react'
import type { BoardMode } from '@/lib/board-workspace-types'
import type { PayDateCard, User } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  HEADER_COLOR_SWATCHES,
  NEUTRAL_HEADER_COLOR,
  isNeutralHeaderColor,
  resolveHeaderVisual,
} from './header-colors'
import {
  animateScrollModuleHeaderEditFormBottomIntoView,
  MODULE_HEADER_EDIT_REVEAL_MS,
} from '@/lib/pay-date-card-form-scroll'
import { PayDateEditor } from './PayDateEditor'
import { PayDateField } from './PayDateField'

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

export type ModuleHeaderProps = {
  card: PayDateCard
  boardMode?: BoardMode
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
  card,
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
  const [headerEditorOpen, setHeaderEditorOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [payDateEditorOpen, setPayDateEditorOpen] = useState(false)
  const [editingPayAmount, setEditingPayAmount] = useState(false)
  const [ownerDraft, setOwnerDraft] = useState(card.owner)
  const [sourceDraft, setSourceDraft] = useState(card.source)
  const [payDateDraft, setPayDateDraft] = useState(toIsoDate(card.payDate))
  const [payAmountDraft, setPayAmountDraft] = useState(String(card.payAmount ?? 0))
  const [payAmountInlineDraft, setPayAmountInlineDraft] = useState(formatCurrency(card.payAmount ?? 0))
  const [headerColorDraft, setHeaderColorDraft] = useState(headerColor)
  const headerRootRef = useRef<HTMLDivElement>(null)
  const headerEditFormRef = useRef<HTMLDivElement>(null)
  const headerEditScrollCancelRef = useRef<(() => void) | null>(null)
  const payDateAnchorRef = useRef<HTMLButtonElement>(null)
  const payAmountInputRef = useRef<HTMLInputElement>(null)

  const initials = ownerName.trim().charAt(0).toUpperCase() || '?'
  const displayHeaderColor = headerEditorOpen ? headerColorDraft : headerColor
  const visual = resolveHeaderVisual({
    headerColor: displayHeaderColor,
    ownerId: card.owner,
    highlightDrop,
  })
  const payAmount = card.payAmount ?? 0
  const hasPayAmount = card.payAmount !== null && card.payAmount !== undefined
  const labelClass =
    'flex min-w-0 flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-(--text-tertiary)'
  const inputClass =
    'w-full rounded-md border border-[--border] bg-(--bg-primary) px-3 py-2 text-sm text-(--text-primary) outline-none transition duration-200 ease-out focus:border-(--navy)'

  function resetHeaderDrafts() {
    setOwnerDraft(card.owner)
    setSourceDraft(card.source)
    setPayDateDraft(toIsoDate(card.payDate))
    setPayAmountDraft(String(card.payAmount ?? 0))
    setHeaderColorDraft(headerColor)
  }

  const openHeaderEditor = () => {
    resetHeaderDrafts()
    setEditingPayAmount(false)
    setPayDateEditorOpen(false)
    setDeleteConfirmOpen(false)
    setHeaderEditorOpen(true)
  }

  const toggleHeaderEditor = () => {
    if (headerEditorOpen) cancelHeaderEdit()
    else openHeaderEditor()
  }

  useEffect(() => {
    if (!editingPayAmount) return
    payAmountInputRef.current?.focus()
    requestAnimationFrame(() => payAmountInputRef.current?.select())
  }, [editingPayAmount])

  useLayoutEffect(() => {
    headerEditScrollCancelRef.current?.()
    headerEditScrollCancelRef.current = null

    if (!headerEditorOpen) return

    const form = headerEditFormRef.current
    const expandBelowPx = form ? form.scrollHeight + 15 : 0

    headerEditScrollCancelRef.current = animateScrollModuleHeaderEditFormBottomIntoView(
      headerRootRef.current,
      {
        durationMs: MODULE_HEADER_EDIT_REVEAL_MS,
        expandBelowPx,
      }
    )

    return () => {
      headerEditScrollCancelRef.current?.()
      headerEditScrollCancelRef.current = null
    }
  }, [headerEditorOpen])

  function closeHeaderEditor() {
    setHeaderEditorOpen(false)
  }

  const saveHeader = () => {
    if (ownerDraft !== card.owner) onOwnerChange(ownerDraft)
    if (sourceDraft.trim() !== card.source) onSourceChange(sourceDraft.trim())
    if (payDateDraft && payDateDraft !== toIsoDate(card.payDate)) onPayDateChange(payDateDraft)
    const nextAmount = parseMoneyInput(payAmountDraft)
    if (nextAmount !== null && nextAmount !== payAmount) onPayAmountChange(nextAmount)
    const savedColor = headerColor?.toUpperCase() ?? ''
    const draftColor = headerColorDraft?.toUpperCase() ?? ''
    if (draftColor !== savedColor) {
      onMenuAction(`set-header-color:${headerColorDraft ?? NEUTRAL_HEADER_COLOR}`)
    }
    setDeleteConfirmOpen(false)
    closeHeaderEditor()
  }

  const cancelHeaderEdit = () => {
    resetHeaderDrafts()
    setDeleteConfirmOpen(false)
    closeHeaderEditor()
  }

  const duplicateCard = () => {
    onMenuAction('duplicate-card')
    closeHeaderEditor()
  }

  const deleteCard = () => {
    onMenuAction('remove-card')
    setDeleteConfirmOpen(false)
    closeHeaderEditor()
  }

  const savePayAmount = () => {
    const next = parseMoneyInput(payAmountInlineDraft)
    if (next !== null && next !== payAmount) onPayAmountChange(next)
    setPayAmountInlineDraft(formatCurrency(next !== null ? next : payAmount))
    setEditingPayAmount(false)
  }

  const headerRevealTransition = {
    transitionDuration: `${MODULE_HEADER_EDIT_REVEAL_MS}ms`,
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  } as const

  return (
    <div ref={headerRootRef} className="module-header-bar pb-0">
      {/* Summary band — fixed height/padding whether or not the edit form is open */}
      <div
        style={{ backgroundColor: visual.bg }}
        className="py-3"
      >
        <div className="flex items-start justify-between gap-4 px-3.5">
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
                  <span>{card.source} - </span>
                  <button
                    ref={payDateAnchorRef}
                    type="button"
                    className="rounded px-1.5 py-1.5 transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5"
                    onClick={() => {
                      setEditingPayAmount(false)
                      setPayDateEditorOpen(true)
                    }}
                  >
                    {formatDate(card.payDate)}
                  </button>
                </div>
                <div className="truncate text-[13px] leading-snug" style={{ color: visual.subtitle }}>
                  {ownerName}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-start">
              <div className="module-financial-rail shrink-0">
                <div
                  className={cn(
                    'module-pay-amount-slot balance-display',
                    !editingPayAmount && 'transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5',
                  )}
                  style={{ color: hasPayAmount ? visual.title : visual.caption }}
                >
                  {editingPayAmount ? (
                    <input
                      ref={payAmountInputRef}
                      value={payAmountInlineDraft}
                      onChange={e => setPayAmountInlineDraft(e.target.value)}
                      onFocus={e => e.currentTarget.select()}
                      onClick={e => e.currentTarget.select()}
                      className="inline-currency-input"
                      onBlur={savePayAmount}
                      onKeyDown={e => {
                        if (e.key === 'Enter') savePayAmount()
                        if (e.key === 'Escape') {
                          setPayAmountInlineDraft(formatCurrency(payAmount))
                          setEditingPayAmount(false)
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPayDateEditorOpen(false)
                        setPayAmountInlineDraft(formatCurrency(payAmount))
                        setEditingPayAmount(true)
                      }}
                    >
                      {formatCurrency(payAmount)}
                    </button>
                  )}
                </div>
                <span className="section-label" style={{ color: visual.caption }}>
                  Pay amount
                </span>
              </div>

              <div className="module-actions-cell module-header-actions relative flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    toggleHeaderEditor()
                  }}
                  className={cn(
                    'inline-flex size-7 cursor-pointer items-center justify-center rounded-md transition-[color,background-color] duration-150 hover:bg-black/10 dark:hover:bg-white/10',
                    headerEditorOpen && 'bg-black/10 dark:bg-white/10'
                  )}
                  style={{
                    color: headerEditorOpen ? visual.title : visual.caption,
                    opacity: headerEditorOpen ? 1 : 0.72,
                  }}
                  aria-label={headerEditorOpen ? 'Close header edit' : 'Edit header'}
                  aria-expanded={headerEditorOpen}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        <PayDateEditor
          open={payDateEditorOpen}
          anchorRef={payDateAnchorRef}
          value={card.payDate}
          onClose={() => setPayDateEditorOpen(false)}
          onCommit={iso => onPayDateChange(iso)}
        />
      </div>
      {/* Edit panel drops below the summary — form carries the bottom divider when open */}
      <div
        className={cn(
          'grid overflow-hidden bg-(--bg-primary) transition-[grid-template-rows]',
          headerEditorOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        style={headerRevealTransition}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={headerEditFormRef}
            className="module-header-edit-form border-t border-[--border] border-b-2 border-b-[--expense-edit-separator] pt-[15px] pb-4"
          >
            <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,1fr)] gap-6">
              <div className="grid min-w-0 grid-cols-2 gap-4">
                <label className={labelClass}>
                  <span>Income source</span>
                  <select
                    value={sourceDraft}
                    onChange={e => setSourceDraft(e.target.value)}
                    className={inputClass}
                  >
                    {sourceDraft.trim() === '' ? <option value="">Select source</option> : null}
                    {[...new Set([card.source, ...incomeSources].filter(Boolean))].map(source => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Owner</span>
                  <select
                    value={ownerDraft}
                    onChange={e => setOwnerDraft(e.target.value)}
                    className={inputClass}
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Pay date</span>
                  <PayDateField value={payDateDraft} onChange={setPayDateDraft} />
                </label>
                <label className={labelClass}>
                  <span>Pay amount</span>
                  <input
                    value={payAmountDraft}
                    onChange={e => setPayAmountDraft(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className={cn(labelClass, 'min-w-0')}>
                <span>Header color</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    title="Neutral"
                    aria-label="Neutral header"
                    className={cn(
                      'size-7 shrink-0 rounded-full border border-(--border-strong) bg-(--bg-secondary) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
                      isNeutralHeaderColor(headerColorDraft) && 'ring-2 ring-(--navy) ring-offset-1'
                    )}
                    onClick={() => setHeaderColorDraft(NEUTRAL_HEADER_COLOR)}
                  />
                  {HEADER_COLOR_SWATCHES.map(sw => (
                    <button
                      key={`hdr-${sw.value}`}
                      type="button"
                      title={sw.label}
                      aria-label={`${sw.label} header`}
                      className={cn(
                        'size-7 shrink-0 rounded-full border border-(--border-strong) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
                        headerColorDraft?.toUpperCase() === sw.value.toUpperCase() &&
                          'ring-2 ring-(--navy) ring-offset-1'
                      )}
                      style={{ backgroundColor: sw.value }}
                      onClick={() => setHeaderColorDraft(sw.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[--border] pt-4">
              <button
                type="button"
                onClick={duplicateCard}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
              >
                <Copy className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Duplicate
              </button>
              {deleteConfirmOpen ? (
                <>
                  <button
                    type="button"
                    onClick={deleteCard}
                    className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-(--danger) transition duration-150 ease-out"
                    aria-label="Confirm delete card"
                  >
                    <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--text-secondary)"
                    aria-label="Cancel delete"
                  >
                    <X className="size-3.5" strokeWidth={2.25} aria-hidden />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--danger)"
                >
                  <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  Delete
                </button>
              )}
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={cancelHeaderEdit}
                  className="cursor-pointer text-xs font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveHeader}
                  className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-(--navy) px-3 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
