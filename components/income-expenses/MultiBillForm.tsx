'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react'
import { resolveIcon, type IconKey } from '@/lib/icons'
import { IconPicker } from './IconPicker'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { resolveMinMonthlyPaymentOnSave } from '@/lib/creditors'
import { findCategoryByName, getFallbackCategory, sortCategoriesForDropdown } from '@/lib/category-definitions'
import { dueToPattern, normalizeWebsiteInput } from './ExpenseEditForm'
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { generateId } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'

type DueMode = 'day' | 'varies' | 'none'

type DraftBillRow = {
  key: string
  icon: string
  name: string
  amount: string
  dueMode: DueMode
  dueDay: string
  category: string
  accountLastFour: string
  url: string
  trackDebt: boolean
  expanded: boolean
  iconAnchorRef: React.RefObject<HTMLButtonElement | null>
}

function makeEmptyRow(defaultCategory: string): DraftBillRow {
  return {
    key: generateId('draft-bill'),
    icon: '',
    name: '',
    amount: '',
    dueMode: 'none',
    dueDay: '',
    category: defaultCategory,
    accountLastFour: '',
    url: '',
    trackDebt: false,
    expanded: false,
    iconAnchorRef: { current: null },
  }
}

function isRowValid(row: DraftBillRow): boolean {
  return row.name.trim() !== '' && parseMoneyInput(row.amount) !== null
}

function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

function resolveRowToCreditorChanges(row: DraftBillRow, categories: CategoryDefinition[]): Partial<Creditor> {
  const plannedAmount = parseMoneyInput(row.amount) ?? 0
  const matchedCategory =
    findCategoryByName(categories, 'expense', row.category) ?? getFallbackCategory(categories, 'expense')
  const nextDueDay: Creditor['dueDay'] =
    row.dueMode === 'day'
      ? Math.min(31, Math.max(1, Number.parseInt(row.dueDay, 10) || 1))
      : row.dueMode === 'varies'
        ? 'varies'
        : null

  return {
    name: row.name.trim(),
    defaultAmount: plannedAmount,
    dueDay: nextDueDay,
    dueDatePattern: dueToPattern(nextDueDay),
    accountLastFour: row.accountLastFour.replace(/\D/g, '').slice(0, 4) || undefined,
    url: normalizeWebsiteInput(row.url) || undefined,
    website: normalizeWebsiteInput(row.url) || undefined,
    category: matchedCategory.name as Creditor['category'],
    categoryId: matchedCategory.id,
    icon: row.icon || undefined,
    trackDebt: row.trackDebt,
    debtDetail: row.trackDebt
      ? {
          type: 'revolving',
          balanceOwed: 0,
          minMonthlyPayment: resolveMinMonthlyPaymentOnSave(plannedAmount, ''),
          availableCredit: undefined,
          creditLimit: undefined,
          apr: undefined,
        }
      : undefined,
  }
}

type MultiBillFormProps = {
  categories: CategoryDefinition[]
  defaultCategoryName: string
  formId: string
  onSave: (rows: Partial<Creditor>[]) => void
  onValidCountChange: (count: number) => void
}

const inputClass =
  'field-control h-9 w-full border border-[--module-divider-color] px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary) focus:border-(--green)'
const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[12px] font-medium tracking-normal text-(--text-secondary)'
const linkClass =
  'text-[13px] font-medium text-(--text-tertiary) underline decoration-[color-mix(in_srgb,var(--text-tertiary)_40%,transparent)] underline-offset-2 transition duration-200 ease-out hover:text-(--navy) hover:decoration-(--navy)'

export function MultiBillForm({ categories, defaultCategoryName, formId, onSave, onValidCountChange }: MultiBillFormProps) {
  const [rows, setRows] = useState<DraftBillRow[]>(() => [makeEmptyRow(defaultCategoryName)])
  const [iconPickerKey, setIconPickerKey] = useState<string | null>(null)
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const pendingFocusKeyRef = useRef<string | null>(rows[0]?.key ?? null)

  const categoryOptions = useMemo(() => sortCategoriesForDropdown(categories, 'expense').map(c => c.name), [categories])

  useEffect(() => {
    const key = pendingFocusKeyRef.current
    if (!key) return
    pendingFocusKeyRef.current = null
    queueMicrotask(() => nameInputRefs.current[key]?.focus())
  }, [rows])

  const validCount = useMemo(() => rows.filter(isRowValid).length, [rows])

  useEffect(() => {
    onValidCountChange(validCount)
  }, [validCount, onValidCountChange])

  const updateRow = (key: string, changes: Partial<DraftBillRow>) => {
    setRows(prev => prev.map(row => (row.key === key ? { ...row, ...changes } : row)))
  }

  const addRow = () => {
    const newRow = makeEmptyRow(defaultCategoryName)
    pendingFocusKeyRef.current = newRow.key
    setRows(prev => [...prev, newRow])
  }

  const removeRow = (key: string) => {
    setRows(prev => {
      const next = prev.filter(row => row.key !== key)
      return next.length > 0 ? next : [makeEmptyRow(defaultCategoryName)]
    })
  }

  const handleAmountKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (index === rows.length - 1) {
      addRow()
    } else {
      nameInputRefs.current[rows[index + 1]?.key ?? '']?.focus()
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validRows = rows.filter(isRowValid)
    if (validRows.length === 0) return
    onSave(validRows.map(row => resolveRowToCreditorChanges(row, categories)))
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="bg-[color-mix(in_srgb,var(--bg-secondary)_60%,transparent)] px-5 py-5">
      <div className="max-w-3xl space-y-3">
        <div className="flex items-start gap-3 px-px">
          <span className={cn(labelClass, 'w-9 shrink-0')}>Icon</span>
          <span className={cn(labelClass, 'w-56 shrink-0')}>Bill name</span>
          <span className={cn(labelClass, 'w-28 shrink-0')}>Amount</span>
          <span className="w-7 shrink-0" aria-hidden />
          <span className="w-7 shrink-0" aria-hidden />
        </div>

        <div className="space-y-2">
          {rows.map((row, index) => {
            const { Icon: ResolvedIcon, key: resolvedIconKey } = resolveIcon(row.icon || undefined, row.category)
            return (
              <div key={row.key} className="group">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <button
                      ref={row.iconAnchorRef}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setIconPickerKey(open => (open === row.key ? null : row.key))}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-(--bg-secondary) transition-colors hover:brightness-95"
                      aria-label="Change icon"
                    >
                      <ResolvedIcon className="size-4 text-(--text-primary)" />
                    </button>
                    {iconPickerKey === row.key && (
                      <IconPicker
                        selected={resolvedIconKey}
                        onSelect={(key: IconKey) => updateRow(row.key, { icon: key })}
                        onClose={() => setIconPickerKey(null)}
                        anchorRef={row.iconAnchorRef}
                      />
                    )}
                  </div>

                  <input
                    ref={el => { nameInputRefs.current[row.key] = el }}
                    className={cn(inputClass, 'w-56 shrink-0')}
                    value={row.name}
                    placeholder="Name this bill"
                    onChange={e => updateRow(row.key, { name: e.target.value })}
                  />
                  <div className="relative w-28 shrink-0">
                    <input
                      className={cn(inputClass, 'pr-9')}
                      value={row.amount}
                      placeholder="$0.00"
                      inputMode="decimal"
                      onChange={e => updateRow(row.key, { amount: sanitizeAmountInput(e.target.value) })}
                      onKeyDown={e => handleAmountKeyDown(e, index)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-(--text-tertiary)">
                      /mo
                    </span>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => updateRow(row.key, { expanded: !row.expanded })}
                    aria-label={row.expanded ? 'Collapse bill details' : 'Expand bill details'}
                    aria-expanded={row.expanded}
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-input text-(--text-tertiary) transition duration-200 ease-out hover:bg-(--bg-secondary) hover:text-(--text-primary)"
                  >
                    {row.expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => removeRow(row.key)}
                    aria-label="Remove bill"
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-input text-(--text-tertiary) opacity-0 transition duration-200 ease-out hover:text-(--danger) group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {row.expanded && (
                  <div className="ml-12 mt-3 space-y-4 border-l border-[--module-divider-color] pl-4">
                    <div className="flex items-start gap-3">
                      <label className={cn(labelClass, 'w-36 shrink-0')}>
                        <span>Due date</span>
                        <select
                          className={inputClass}
                          value={row.dueMode}
                          onChange={e => updateRow(row.key, { dueMode: e.target.value as DueMode })}
                        >
                          <option value="day">Day of month</option>
                          <option value="varies">Varies</option>
                          <option value="none">Blank</option>
                        </select>
                      </label>
                      {row.dueMode === 'day' && (
                        <label className={cn(labelClass, 'w-14 shrink-0')}>
                          <span>Day</span>
                          <input
                            className={cn(inputClass, 'tabular-nums')}
                            type="number"
                            min={1}
                            max={31}
                            value={row.dueDay}
                            onChange={e => updateRow(row.key, { dueDay: e.target.value })}
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <label className={cn(labelClass, 'w-48 shrink-0')}>
                        <span>Category</span>
                        <select
                          className={inputClass}
                          value={row.category}
                          onChange={e => updateRow(row.key, { category: e.target.value })}
                        >
                          {categoryOptions.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={cn(labelClass, 'w-20 shrink-0')}>
                        <span>Last four</span>
                        <input
                          className={inputClass}
                          value={row.accountLastFour}
                          maxLength={4}
                          onChange={e => updateRow(row.key, { accountLastFour: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        />
                      </label>
                    </div>

                    <label className={cn(labelClass, 'w-44')}>
                      <div className="flex items-center gap-1">
                        <span>Website</span>
                        <ExternalLink className="size-3 text-(--text-tertiary)" strokeWidth={2.5} aria-hidden />
                      </div>
                      <input className={inputClass} value={row.url} onChange={e => updateRow(row.key, { url: e.target.value })} />
                    </label>

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-(--text-secondary) transition duration-200 ease-out hover:text-(--text-primary)">
                        <input
                          type="checkbox"
                          checked={row.trackDebt}
                          onChange={e => updateRow(row.key, { trackDebt: e.target.checked })}
                          aria-label="Track in Debt Tracker"
                          className="size-4 accent-(--navy)"
                        />
                        <span>Track in</span>
                      </label>
                      <Link href={DASHBOARD_PATHS.debtTracker} className={linkClass}>
                        Debt Tracker
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addRow} className={linkClass}>
          + Add another bill
        </button>
      </div>
    </form>
  )
}
