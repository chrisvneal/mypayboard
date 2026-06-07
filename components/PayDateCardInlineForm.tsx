'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoryDisplayName, filterMasterListPickerCreditors, groupCreditorsForPicker } from '@/lib/creditors'
import { resolveTemplatePayDateIso } from '@/lib/board-from-template'
import { generateId } from '@/lib/format'
import { isoToTemplatePayDay } from '@/lib/template-board-adapter'
import { resolveCreditorId, templatePayDateSortValue } from '@/lib/template-utils'
import {
  PAY_DATE_CARD_FORM_VIEWPORT_MARGIN,
  scrollPayDateCardFormBottomIntoView,
} from '@/lib/pay-date-card-form-scroll'
import type { Bill, Creditor, Income, PayDateCard, Template, User } from '@/lib/types'
import { cn } from '@/lib/utils'

const fieldClass =
  'h-9 w-full rounded-lg border border-border bg-(--bg-primary) px-3 text-[13px] outline-none focus:border-(--navy)'

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
    if (!billsOpen) return
    syncPanelMaxHeight()
  }, [billsOpen, syncPanelMaxHeight])

  useEffect(() => {
    if (!billsOpen) return
    window.addEventListener('resize', syncPanelMaxHeight)
    return () => window.removeEventListener('resize', syncPanelMaxHeight)
  }, [billsOpen, syncPanelMaxHeight])

  function handleRevealTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== 'grid-template-rows') return
    if (!billsOpen) return
    syncPanelMaxHeight()
    scrollPayDateCardFormBottomIntoView(rootRef.current, 'smooth')
  }

  return (
    <div ref={rootRef}>
      <button
        type="button"
        onClick={() => setBillsOpen(o => !o)}
        aria-expanded={billsOpen}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-[13px] font-medium text-(--text-primary) hover:bg-(--bg-secondary)"
      >
        Select bills
        <ChevronDown
          className={cn(
            'size-4 text-(--text-tertiary) transition-transform duration-150 ease-out',
            billsOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-150 ease-out',
          billsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        onTransitionEnd={handleRevealTransitionEnd}
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
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-(--bg-secondary)">
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
      c => c.id === creditorId || c.id === resolveCreditorId(creditorId)
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

function defaultPreviewPayDateIso(month: number, year: number, day = 15): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function headerColorForOwner(ownerId: string): string {
  return ownerId === 'user-nicole' ? '#E8F7EE' : '#E6F1FB'
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
    () => incomes.filter(i => i.active !== false && !i.archived),
    [incomes]
  )

  const defaultOwner = assignedUsers[0]?.id ?? 'user-chris'
  const defaultIncome = activeIncomes[0]

  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [incomeId, setIncomeId] = useState(defaultIncome?.id ?? '')
  const [payAmount, setPayAmount] = useState('')
  const [payDateIso, setPayDateIso] = useState(() =>
    defaultPreviewPayDateIso(previewMonth, previewYear)
  )
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => new Set())

  const incomeName =
    activeIncomes.find(i => i.id === incomeId)?.name ?? defaultIncome?.name ?? ''

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
    const amount = Number.parseFloat(payAmount.replace(/[^0-9.-]/g, '')) || 0
    const dayPattern = isoToTemplatePayDay(payDateIso, previewMonth, previewYear)
    const dayNum = templatePayDateSortValue(dayPattern)

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
      headerColor: headerColorForOwner(ownerId),
    }
    onSave(card)
  }

  return (
    <InlineFormShell onSave={handleSave} onCancel={onCancel}>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
          Income source
        </label>
        <Select value={incomeId} onValueChange={setIncomeId}>
          <SelectTrigger className="h-9 w-full min-w-0 text-[13px]">
            <SelectValue placeholder="Select income" />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
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
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
            Pay date
          </label>
          <input
            type="date"
            value={payDateIso}
            onChange={e => setPayDateIso(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
          Base pay amount
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={payAmount}
          onChange={e => setPayAmount(e.target.value)}
          placeholder="0.00"
          className={cn(fieldClass, 'max-w-[200px]')}
        />
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
    () => incomes.filter(i => i.active !== false && !i.archived),
    [incomes]
  )
  const defaultOwner = defaultOwnerId ?? users[0]?.id ?? 'user-chris'
  const defaultIncome = activeIncomes[0]

  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [incomeId, setIncomeId] = useState(defaultIncome?.id ?? '')
  const [payAmount, setPayAmount] = useState('')
  const [payDateIso, setPayDateIso] = useState(() =>
    defaultPreviewPayDateIso(boardMonth, boardYear)
  )
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => new Set())

  const incomeName =
    activeIncomes.find(i => i.id === incomeId)?.name ?? defaultIncome?.name ?? ''

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
    const amount = Number.parseFloat(payAmount.replace(/[^0-9.-]/g, '')) || 0
    const dayPattern = isoToTemplatePayDay(payDateIso, boardMonth, boardYear)
    const dayNum = templatePayDateSortValue(dayPattern)

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
      headerColor: headerColorForOwner(ownerId),
    }
    onSave(card)
  }

  return (
    <InlineFormShell onSave={handleSave} onCancel={onCancel}>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
          Income source
        </label>
        <Select value={incomeId} onValueChange={setIncomeId}>
          <SelectTrigger className="h-9 w-full min-w-0 text-[13px]">
            <SelectValue placeholder="Select income" />
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
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
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
            Pay date
          </label>
          <input
            type="date"
            value={payDateIso}
            onChange={e => setPayDateIso(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
          Base pay amount
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={payAmount}
          onChange={e => setPayAmount(e.target.value)}
          placeholder="0.00"
          className={cn(fieldClass, 'max-w-[200px]')}
        />
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
          className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark)"
        >
          Save Card
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) hover:bg-(--bg-tertiary)"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
