'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { computeHeaderBackground, DEFAULT_HEADER_COLOR, getSwatchGradientEndpoint, isNeutralHeaderColor, parseHeaderColor } from '@/components/modules/header-colors'
import { HeaderColorSwatchPicker } from '@/components/modules/HeaderColorSwatchPicker'
import { PayDateField } from '@/components/modules/PayDateField'
import { categoryDisplayName, filterMasterListPickerCreditors, groupCreditorsForPicker, plannedMonthlyPayment } from '@/lib/creditors'
import { resolveTemplatePayDateIso } from '@/lib/board-from-template'
import { generateId, formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { AmountInput } from '@/components/shared/AmountInput'
import { isoToTemplatePayDay } from '@/lib/template-board-adapter'
import { templatePayDateSortValue } from '@/lib/template-utils'
import {
  animateScrollPayDateCardFormBottomIntoView,
  PAY_DATE_CARD_BILL_PANEL_REVEAL_MS,
  PAY_DATE_CARD_FORM_VIEWPORT_MARGIN,
} from '@/lib/pay-date-card-form-scroll'
import type { Bill, Creditor, Income, PayDateCard, Template, User } from '@/lib/types'
import { cn, useIsClient } from '@/lib/utils'

const fieldClass =
  'field-control h-9 w-full border border-border px-3 text-[13px] outline-none focus:border-(--navy)'

/** Matches scroll-margin-bottom on the add-card form host in globals.css */
const FORM_VIEWPORT_MARGIN = PAY_DATE_CARD_FORM_VIEWPORT_MARGIN

type BillSelectionFieldsProps = {
  creditors: Creditor[]
  selectedBillIds: Set<string>
  onToggleBill: (creditorId: string) => void
}

const BILL_PANEL_MAX_HEIGHT = 300
const BILL_PANEL_MIN_HEIGHT = 200
function BillSelectionFields({ creditors, selectedBillIds, onToggleBill }: BillSelectionFieldsProps) {
  const activeExpenses = useMemo(() => filterMasterListPickerCreditors(creditors), [creditors])
  const creditorGroups = useMemo(() => groupCreditorsForPicker(creditors), [creditors])
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollAnimCancelRef = useRef<(() => void) | null>(null)
  const [billsOpen, setBillsOpen] = useState(false)

  const syncPanelMaxHeight = useCallback(() => {
    const root = rootRef.current
    const panel = panelRef.current
    if (!root || !panel) return

    const form = root.closest('.pay-date-card-inline-form')
    const footer = form?.querySelector('.pay-date-card-inline-form__footer')
    const footerHeight = footer instanceof HTMLElement ? footer.offsetHeight : 56
    const toggle = root.querySelector('button')
    const panelTop =
      toggle instanceof HTMLElement
        ? toggle.getBoundingClientRect().bottom + 8
        : panel.getBoundingClientRect().top
    const available = window.innerHeight - panelTop - footerHeight - FORM_VIEWPORT_MARGIN
    const nextMaxHeight = Math.max(BILL_PANEL_MIN_HEIGHT, Math.min(BILL_PANEL_MAX_HEIGHT, available))

    panel.style.maxHeight = `${nextMaxHeight}px`
  }, [])

  useLayoutEffect(() => {
    scrollAnimCancelRef.current?.()
    scrollAnimCancelRef.current = null

    if (!billsOpen) return

    syncPanelMaxHeight()

    const panelMaxHeight = panelRef.current?.style.maxHeight
      ? Number.parseFloat(panelRef.current.style.maxHeight)
      : BILL_PANEL_MAX_HEIGHT

    scrollAnimCancelRef.current = animateScrollPayDateCardFormBottomIntoView(
      rootRef.current,
      {
        durationMs: PAY_DATE_CARD_BILL_PANEL_REVEAL_MS,
        expandBelowPx: panelMaxHeight + 8,
      }
    )

    return () => {
      scrollAnimCancelRef.current?.()
      scrollAnimCancelRef.current = null
    }
  }, [billsOpen, syncPanelMaxHeight])

  useEffect(() => {
    if (!billsOpen) return
    window.addEventListener('resize', syncPanelMaxHeight)
    return () => window.removeEventListener('resize', syncPanelMaxHeight)
  }, [billsOpen, syncPanelMaxHeight])

  return (
    <div ref={rootRef}>
      <button
        type="button"
        onClick={() => setBillsOpen(o => !o)}
        aria-expanded={billsOpen}
        className="field-control flex w-full cursor-pointer items-center justify-between border border-border px-3 py-2 text-left text-[13px] font-medium text-(--text-primary) hover:bg-(--bg-secondary)"
      >
        Select bills
        <ChevronDown
          className={cn(
            'size-4 text-(--text-tertiary) transition-transform ease-out',
            billsOpen && 'rotate-180'
          )}
          style={{ transitionDuration: `${PAY_DATE_CARD_BILL_PANEL_REVEAL_MS}ms` }}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] ease-out',
          billsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        style={{ transitionDuration: `${PAY_DATE_CARD_BILL_PANEL_REVEAL_MS}ms` }}
      >
        <div className={cn('min-h-0 overflow-hidden', !billsOpen && 'pointer-events-none')}>
          <div
            ref={panelRef}
            aria-hidden={!billsOpen}
            className="pay-date-card-bill-panel scrollbar-thin mt-2 min-h-0 space-y-3 overflow-y-auto rounded-lg border border-border p-2"
          >
            {activeExpenses.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-(--text-tertiary)">
                No active expenses on the master list.
              </p>
            ) : (
              creditorGroups.map(group => (
                <section key={group.id}>
                  <h4 className="section-label mb-1.5 px-2">{group.label}</h4>
                  <ul className="space-y-0.5">
                    {group.creditors.map(c => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-input px-2 py-1.5 hover:bg-(--bg-secondary)">
                          <input
                            type="checkbox"
                            checked={selectedBillIds.has(c.id)}
                            onChange={() => onToggleBill(c.id)}
                            className="size-4 rounded border-border"
                            tabIndex={billsOpen ? 0 : -1}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-(--text-primary)">
                            {c.name}
                          </span>
                          <span className="shrink-0 tabular-nums text-[13px] text-(--text-tertiary)">
                            {formatCurrency(plannedMonthlyPayment(c))}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function buildBillsFromSelection(
  selectedBillIds: Set<string>,
  creditors: Creditor[]
): Bill[] {
  return [...selectedBillIds].map(creditorId => {
    const creditor = creditors.find(
      c => c.id === creditorId
    )
    const duePattern =
      creditor?.dueDay != null
        ? String(creditor.dueDay)
        : (creditor?.dueDatePattern?.replace(/^\*\//, '') ?? '')
    return {
      id: generateId('bill'),
      name: creditor?.name ?? 'Bill',
      amount: creditor?.defaultAmount ?? 0,
      dueDate: duePattern,
      category: creditor ? categoryDisplayName(String(creditor.category)) : '',
      paid: false,
      muted: false,
      notes: '',
      origin: 'master' as const,
      creditorId: creditor?.id ?? creditorId,
    }
  })
}

const COLOR_PICKER_WIDTH = 232

interface ColorPickerDotProps {
  value: string
  onChange: (hex: string) => void
}

function ColorPickerDot({ value, onChange }: ColorPickerDotProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [arrowOffset, setArrowOffset] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const isClient = useIsClient()

  useLayoutEffect(() => {
    if (!open) return
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const left = Math.max(8, rect.right - COLOR_PICKER_WIDTH)
    setArrowOffset(rect.left + rect.width / 2 - left)
    setPos({ top: rect.bottom + 6, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const neutral = isNeutralHeaderColor(value)
  const { color: baseColor, gradient } = parseHeaderColor(value)
  const endpoint = !neutral ? getSwatchGradientEndpoint(baseColor) : null
  const dotBackground = !neutral
    ? endpoint
      ? computeHeaderBackground(baseColor, gradient, endpoint)
      : baseColor
    : undefined

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Set header color"
        aria-expanded={open}
        className={cn(
          'size-9 shrink-0 cursor-pointer rounded-full border border-(--border-strong) shadow-sm transition-colors duration-150 hover:border-(--text-secondary)',
          neutral && 'bg-(--bg-secondary)',
          open && 'ring-2 ring-(--navy) ring-offset-1',
        )}
        style={dotBackground ? { background: dotBackground } : undefined}
      />
      {open && isClient && pos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Header color"
          className="fixed z-60 rounded-lg border border-border bg-(--bg-primary) shadow-(--shadow-lg)"
          style={{ top: pos.top, left: pos.left, width: COLOR_PICKER_WIDTH }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute top-[-7px] size-3 rotate-45 rounded-sm border-l border-t border-border bg-(--bg-primary)"
            style={{ left: Math.max(8, Math.min(COLOR_PICKER_WIDTH - 20, arrowOffset - 6)) }}
          />
          <div className="p-3">
            <p className="section-label mb-2">Header color</p>
            <HeaderColorSwatchPicker
              value={value}
              onChange={onChange}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function defaultPreviewPayDateIso(month: number, year: number, day = 15): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

export type PayDateCardInlineFormTemplateProps = {
  variant: 'template'
  template: Template
  users: User[]
  incomes: Income[]
  creditors: Creditor[]
  previewMonth: number
  previewYear: number
  onSave: (card: PayDateCard) => void
  onCancel: () => void
}

export type PayDateCardInlineFormBoardProps = {
  variant: 'board'
  users: User[]
  incomes: Income[]
  creditors: Creditor[]
  boardMonth: number
  boardYear: number
  defaultOwnerId?: string
  onSave: (card: PayDateCard) => void
  onCancel: () => void
}

export type PayDateCardInlineFormProps =
  | PayDateCardInlineFormTemplateProps
  | PayDateCardInlineFormBoardProps

export function PayDateCardInlineForm(props: PayDateCardInlineFormProps) {
  if (props.variant === 'template') {
    return <TemplateVariantForm {...props} />
  }
  return <BoardVariantForm {...props} />
}

function TemplateVariantForm({
  template,
  users,
  incomes,
  creditors,
  previewMonth,
  previewYear,
  onSave,
  onCancel,
}: PayDateCardInlineFormTemplateProps) {
  const assignedUsers = useMemo(
    () => users.filter(u => template.assignedUserIds.includes(u.id)),
    [template.assignedUserIds, users]
  )
  const activeIncomes = useMemo(
    () => incomes.filter(i => i.active !== false && !i.archived && Boolean(i.name?.trim())),
    [incomes]
  )

  const defaultOwner = assignedUsers[0]?.id ?? users[0]?.id ?? ''

  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [incomeId, setIncomeId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDateIso, setPayDateIso] = useState(() =>
    defaultPreviewPayDateIso(previewMonth, previewYear)
  )
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => new Set())
  const [headerColor, setHeaderColor] = useState<string>(DEFAULT_HEADER_COLOR)

  const incomeName = activeIncomes.find(i => i.id === incomeId)?.name ?? ''

  function toggleBill(creditorId: string) {
    setSelectedBillIds(prev => {
      const next = new Set(prev)
      if (next.has(creditorId)) next.delete(creditorId)
      else next.add(creditorId)
      return next
    })
  }

  function handleSave() {
    const payDate = resolveTemplatePayDateIso(payDateIso, previewMonth, previewYear)
    const amount = parseMoneyInput(payAmount) ?? 0
    const { day: dayPattern, monthOffset } = isoToTemplatePayDay(payDateIso, previewMonth, previewYear)
    const dayNum = templatePayDateSortValue(dayPattern, monthOffset)

    const card: PayDateCard = {
      id: generateId('tcard'),
      templatePayDateCardId: undefined,
      owner: ownerId,
      source: incomeName,
      payDate,
      payAmount: amount,
      bills: buildBillsFromSelection(selectedBillIds, creditors),
      notes: [],
      isFromTemplate: true,
      sortOrder: 999,
      boardColumn: dayNum <= 15 ? 1 : 2,
      headerColor,
    }
    onSave(card)
  }

  return (
    <InlineFormShell onSave={handleSave} onCancel={onCancel}>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
          Income source
        </label>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-[0_0_73%]">
            <Select value={incomeId} onValueChange={setIncomeId}>
              <SelectTrigger className="h-9 w-full min-w-0 text-[13px]">
                <SelectValue placeholder="Select income source" />
              </SelectTrigger>
              <SelectContent>
                {activeIncomes.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 justify-center">
            <ColorPickerDot value={headerColor} onChange={setHeaderColor} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
            Owner
          </label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assignedUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
            Pay date
          </label>
          <PayDateField
            value={payDateIso}
            onChange={setPayDateIso}
            templatePreviewMonth={previewMonth}
            templatePreviewYear={previewYear}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
          Pay amount
        </label>
        <div className="w-1/2">
          <AmountInput
            value={payAmount}
            onChange={setPayAmount}
            placeholder="0.00"
            className={fieldClass}
          />
        </div>
      </div>

      <BillSelectionFields
        creditors={creditors}
        selectedBillIds={selectedBillIds}
        onToggleBill={toggleBill}
      />
    </InlineFormShell>
  )
}

function BoardVariantForm({
  users,
  incomes,
  creditors,
  boardMonth,
  boardYear,
  defaultOwnerId,
  onSave,
  onCancel,
}: PayDateCardInlineFormBoardProps) {
  const activeIncomes = useMemo(
    () => incomes.filter(i => i.active !== false && !i.archived && Boolean(i.name?.trim())),
    [incomes]
  )
  const defaultOwner = defaultOwnerId ?? users[0]?.id ?? ''

  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [incomeId, setIncomeId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payDateIso, setPayDateIso] = useState(() =>
    defaultPreviewPayDateIso(boardMonth, boardYear)
  )
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => new Set())
  const [headerColor, setHeaderColor] = useState<string>(DEFAULT_HEADER_COLOR)

  const incomeName = activeIncomes.find(i => i.id === incomeId)?.name ?? ''

  function toggleBill(creditorId: string) {
    setSelectedBillIds(prev => {
      const next = new Set(prev)
      if (next.has(creditorId)) next.delete(creditorId)
      else next.add(creditorId)
      return next
    })
  }

  function handleSave() {
    const payDate = resolveTemplatePayDateIso(payDateIso, boardMonth, boardYear)
    const amount = parseMoneyInput(payAmount) ?? 0
    const { day: dayPattern, monthOffset } = isoToTemplatePayDay(payDateIso, boardMonth, boardYear)
    const dayNum = templatePayDateSortValue(dayPattern, monthOffset)

    const card: PayDateCard = {
      id: generateId('mod'),
      owner: ownerId,
      source: incomeName,
      payDate,
      payAmount: amount || null,
      bills: buildBillsFromSelection(selectedBillIds, creditors),
      notes: [],
      isFromTemplate: false,
      sortOrder: 999,
      boardColumn: dayNum <= 15 ? 1 : 2,
      headerColor,
    }
    onSave(card)
  }

  return (
    <InlineFormShell onSave={handleSave} onCancel={onCancel}>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
          Income source
        </label>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-[0_0_73%]">
            <Select value={incomeId} onValueChange={setIncomeId}>
              <SelectTrigger className="h-9 w-full min-w-0 text-[13px]">
                <SelectValue placeholder="Select income source" />
              </SelectTrigger>
              <SelectContent>
                {activeIncomes.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-1 justify-center">
            <ColorPickerDot value={headerColor} onChange={setHeaderColor} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
            Owner
          </label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
              <SelectItem value="shared">Shared</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
            Pay date
          </label>
          <PayDateField value={payDateIso} onChange={setPayDateIso} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-medium text-(--text-secondary)">
          Pay amount
        </label>
        <div className="w-1/2">
          <AmountInput
            value={payAmount}
            onChange={setPayAmount}
            placeholder="0.00"
            className={fieldClass}
          />
        </div>
      </div>

      <BillSelectionFields
        creditors={creditors}
        selectedBillIds={selectedBillIds}
        onToggleBill={toggleBill}
      />
    </InlineFormShell>
  )
}

function InlineFormShell({
  children,
  onSave,
  onCancel,
}: {
  children: ReactNode
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="pay-date-card-inline-form module-card w-full max-w-[320px] overflow-hidden shadow-(--shadow-md)">
      <div className="space-y-4 border-b border-border px-5 py-4">
        <h3 className="text-[14px] font-semibold text-(--text-primary)">Add pay date card</h3>
        {children}
      </div>
      <div className="pay-date-card-inline-form__footer flex flex-wrap gap-2 px-5 py-3">
        <button
          type="button"
          onClick={onSave}
          className="btn-navy inline-flex h-9 cursor-pointer items-center px-4 text-[13px] font-semibold shadow-(--shadow-sm)"
        >
          Save Card
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 cursor-pointer items-center rounded-input border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) hover:bg-(--bg-tertiary)"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
