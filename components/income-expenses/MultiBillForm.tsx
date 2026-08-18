'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react'
import { resolveIcon, type IconKey } from '@/lib/icons'
import { IconPicker } from './IconPicker'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { categoryDisplayName, resolveMinMonthlyPaymentOnSave } from '@/lib/creditors'
import { findCategoryByName, getFallbackCategory, sortCategoriesForDropdown } from '@/lib/category-definitions'
import {
  displayCategory,
  dueToPattern,
  normalizeWebsiteInput,
  optionalNumber,
  parsePercentPreservingZero,
  requiredDebtCurrencySave,
} from './ExpenseEditForm'
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { formatCurrency, generateId } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'
import { AmountInput } from '@/components/shared/AmountInput'
import {
  Select,
  SELECT_DISPLAY_ONLY_VALUE,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DueMode = 'day' | 'varies' | 'none'
type DebtType = 'revolving' | 'installment'

type DraftBillRow = {
  key: string
  icon: string
  name: string
  amount: string
  dueMode: DueMode
  dueDay: string
  category: string
  creatingCategory: boolean
  newCategory: string
  categoryError: string
  categorySelectOpen: boolean
  accountLastFour: string
  url: string
  trackDebt: boolean
  debtType: DebtType
  debtBalanceOwed: string
  debtMinPayment: string
  debtAvailableCredit: string
  debtCreditLimit: string
  debtApr: string
  expanded: boolean
  iconAnchorRef: React.RefObject<HTMLButtonElement | null>
}

function makeEmptyRow(defaultCategory: string): DraftBillRow {
  return {
    key: generateId('draft-bill'),
    icon: '',
    name: '',
    amount: '',
    dueMode: 'day',
    dueDay: '1',
    category: defaultCategory,
    creatingCategory: false,
    newCategory: '',
    categoryError: '',
    categorySelectOpen: false,
    accountLastFour: '',
    url: '',
    trackDebt: false,
    debtType: 'revolving',
    debtBalanceOwed: '',
    debtMinPayment: '',
    debtAvailableCredit: '',
    debtCreditLimit: '',
    debtApr: '',
    expanded: false,
    iconAnchorRef: { current: null },
  }
}

function isRowValid(row: DraftBillRow): boolean {
  return row.name.trim() !== '' && parseMoneyInput(row.amount) !== null
}

function isRowEmpty(row: DraftBillRow): boolean {
  return row.name.trim() === '' && parseMoneyInput(row.amount) === null
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

  const savedBalanceOwed = requiredDebtCurrencySave(row.debtBalanceOwed)
  const savedCreditLimit = optionalNumber(row.debtCreditLimit)
  const manualAvailableCredit = optionalNumber(row.debtAvailableCredit)
  const resolvedAvailableCredit =
    manualAvailableCredit !== undefined
      ? manualAvailableCredit
      : typeof savedCreditLimit === 'number'
        ? savedCreditLimit - savedBalanceOwed
        : undefined

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
          type: row.debtType,
          balanceOwed: savedBalanceOwed,
          minMonthlyPayment: resolveMinMonthlyPaymentOnSave(plannedAmount, row.debtMinPayment),
          availableCredit: resolvedAvailableCredit,
          creditLimit: savedCreditLimit,
          apr: parsePercentPreservingZero(row.debtApr),
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
  onCategoryCreate: (category: string) => void
  onUnsavedCategoryChange?: (hasUnsaved: boolean) => void
}

const inputClass =
  'field-control h-9 w-full border border-[--module-divider-color] px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary) focus:border-(--green)'
const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[12px] font-medium tracking-normal text-(--text-secondary)'
const linkClass =
  'text-[13px] font-medium text-(--text-tertiary) underline decoration-[color-mix(in_srgb,var(--text-tertiary)_40%,transparent)] underline-offset-2 transition duration-200 ease-out hover:text-(--navy) hover:decoration-(--navy)'

export function MultiBillForm({
  categories,
  defaultCategoryName,
  formId,
  onSave,
  onValidCountChange,
  onCategoryCreate,
  onUnsavedCategoryChange,
}: MultiBillFormProps) {
  const [rows, setRows] = useState<DraftBillRow[]>(() => [makeEmptyRow(defaultCategoryName)])
  const [iconPickerKey, setIconPickerKey] = useState<string | null>(null)
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const pendingFocusKeyRef = useRef<string | null>(rows[0]?.key ?? null)
  const newCategoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const pendingCategoryFocusKeyRef = useRef<string | null>(null)
  const availableCreditManuallyEditedRef = useRef<Record<string, boolean>>({})

  const categoryOptions = useMemo(() => sortCategoriesForDropdown(categories, 'expense').map(c => c.name), [categories])

  useEffect(() => {
    const key = pendingFocusKeyRef.current
    if (!key) return
    pendingFocusKeyRef.current = null
    queueMicrotask(() => nameInputRefs.current[key]?.focus())
  }, [rows])

  useEffect(() => {
    const key = pendingCategoryFocusKeyRef.current
    if (!key) return
    pendingCategoryFocusKeyRef.current = null
    queueMicrotask(() => newCategoryInputRefs.current[key]?.focus())
  }, [rows])

  const validCount = useMemo(() => rows.filter(isRowValid).length, [rows])
  const hasEmptyRow = useMemo(() => rows.some(isRowEmpty), [rows])
  const hasUnsavedCategory = useMemo(
    () => rows.some(row => row.creatingCategory && row.newCategory.trim().length > 0),
    [rows]
  )

  useEffect(() => {
    onValidCountChange(validCount)
  }, [validCount, onValidCountChange])

  useEffect(() => {
    onUnsavedCategoryChange?.(hasUnsavedCategory)
    return () => onUnsavedCategoryChange?.(false)
  }, [hasUnsavedCategory, onUnsavedCategoryChange])

  const updateRow = (key: string, changes: Partial<DraftBillRow>) => {
    setRows(prev => prev.map(row => (row.key === key ? { ...row, ...changes } : row)))
  }

  const startNewCategory = (key: string) => {
    pendingCategoryFocusKeyRef.current = key
    updateRow(key, { categorySelectOpen: false, newCategory: '', categoryError: '', creatingCategory: true })
  }

  const cancelNewCategory = (key: string) => {
    updateRow(key, { newCategory: '', categoryError: '', creatingCategory: false })
  }

  const confirmNewCategory = (row: DraftBillRow) => {
    const next = row.newCategory.trim()
    if (!next) return
    const normalized = displayCategory(categoryDisplayName(next))
    if (categoryOptions.some(option => option.toLowerCase() === normalized.toLowerCase())) {
      updateRow(row.key, { categoryError: 'Category already exists' })
      return
    }
    onCategoryCreate(next)
    updateRow(row.key, { category: normalized, newCategory: '', categoryError: '', creatingCategory: false })
  }

  const recalcAvailableCredit = (row: DraftBillRow) => {
    if (availableCreditManuallyEditedRef.current[row.key]) return
    const limit = parseMoneyInput(row.debtCreditLimit)
    if (limit === null) return
    const owed = parseMoneyInput(row.debtBalanceOwed) ?? 0
    updateRow(row.key, { debtAvailableCredit: formatCurrency(limit - owed) })
  }

  const addRow = () => {
    setRows(prev => {
      if (prev.some(isRowEmpty)) return prev
      const newRow = makeEmptyRow(defaultCategoryName)
      pendingFocusKeyRef.current = newRow.key
      return [...prev, newRow]
    })
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
    if (index === rows.length - 1 && isRowValid(rows[index]!)) {
      addRow()
    } else if (index < rows.length - 1) {
      nameInputRefs.current[rows[index + 1]?.key ?? '']?.focus()
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (hasUnsavedCategory) return
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
                    aria-label="Bill name"
                    onChange={e => updateRow(row.key, { name: e.target.value })}
                  />
                  <div className="relative w-28 shrink-0">
                    <AmountInput
                      className={cn(inputClass, 'pr-9')}
                      value={row.amount}
                      onChange={v => updateRow(row.key, { amount: v })}
                      onKeyDown={e => handleAmountKeyDown(e, index)}
                      aria-label="Amount"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-(--text-tertiary)">
                      /mo
                    </span>
                  </div>
                  <button
                    type="button"
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
                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>Category</span>
                          {row.creatingCategory && row.newCategory.trim() ? (
                            <span className="text-[11px] font-medium text-(--green)">Press Enter to save</span>
                          ) : null}
                        </span>
                        {row.creatingCategory ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <input
                                ref={el => { newCategoryInputRefs.current[row.key] = el }}
                                className={cn(inputClass, 'min-w-0 flex-1')}
                                value={row.newCategory}
                                placeholder="Category name…"
                                onChange={e => updateRow(row.key, { newCategory: e.target.value, categoryError: '' })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    confirmNewCategory(row)
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelNewCategory(row.key)
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => cancelNewCategory(row.key)}
                                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-input border border-[--module-divider-color] bg-(--bg-primary) text-(--text-tertiary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary)"
                                aria-label="Cancel new category"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                            {row.categoryError && (
                              <p className="mt-1 text-[11px] normal-case tracking-normal text-(--danger-muted)">{row.categoryError}</p>
                            )}
                          </div>
                        ) : (
                          <Select
                            open={row.categorySelectOpen}
                            onOpenChange={open => updateRow(row.key, { categorySelectOpen: open })}
                            value={SELECT_DISPLAY_ONLY_VALUE}
                            onValueChange={v => updateRow(row.key, { category: v })}
                          >
                            <SelectTrigger className={inputClass}>
                              <SelectValue>{row.category}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                              <SelectSeparator />
                              <SelectGroup>
                                <SelectLabel>Custom</SelectLabel>
                                <button
                                  type="button"
                                  onPointerDown={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onClick={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    startNewCategory(row.key)
                                  }}
                                  className="relative flex w-full cursor-pointer select-none items-center rounded-input py-3 pl-2 pr-2 text-[13px] text-(--text-primary) outline-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary)"
                                >
                                  + New category
                                </button>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
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

                    <div>
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

                      <div
                        className={cn(
                          'hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out sm:block',
                          row.trackDebt ? 'max-h-105 opacity-100' : 'max-h-0 opacity-0'
                        )}
                      >
                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                          <label className={labelClass}>
                            <span>Balance Owed</span>
                            <AmountInput
                              className={inputClass}
                              value={row.debtBalanceOwed}
                              onChange={v => updateRow(row.key, { debtBalanceOwed: v })}
                              onBlur={() => recalcAvailableCredit(row)}
                            />
                          </label>
                          <label className={labelClass}>
                            <span>Min Payment</span>
                            <AmountInput
                              className={inputClass}
                              value={row.debtMinPayment}
                              onChange={v => updateRow(row.key, { debtMinPayment: v })}
                            />
                          </label>
                          <label className={labelClass}>
                            <span>Available Credit</span>
                            <AmountInput
                              className={inputClass}
                              value={row.debtAvailableCredit}
                              onChange={v => {
                                availableCreditManuallyEditedRef.current[row.key] = true
                                updateRow(row.key, { debtAvailableCredit: v })
                              }}
                              allowNegative
                            />
                          </label>
                          <label className={labelClass}>
                            <span>Credit Limit</span>
                            <AmountInput
                              className={inputClass}
                              value={row.debtCreditLimit}
                              onChange={v => updateRow(row.key, { debtCreditLimit: v })}
                              onBlur={() => recalcAvailableCredit(row)}
                            />
                          </label>
                          <label className={labelClass}>
                            <span>Type</span>
                            <select
                              className={inputClass}
                              value={row.debtType}
                              onChange={e => updateRow(row.key, { debtType: e.target.value as DebtType })}
                            >
                              <option value="revolving">Revolving</option>
                              <option value="installment">Installment</option>
                            </select>
                          </label>
                          <label className={labelClass}>
                            <span>APR %</span>
                            <input
                              className={inputClass}
                              inputMode="decimal"
                              placeholder="24.99"
                              value={row.debtApr}
                              onChange={e => updateRow(row.key, { debtApr: e.target.value })}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          disabled={hasEmptyRow}
          className={cn(linkClass, 'disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline disabled:hover:text-(--text-tertiary)')}
        >
          + Add another bill
        </button>
      </div>
    </form>
  )
}
