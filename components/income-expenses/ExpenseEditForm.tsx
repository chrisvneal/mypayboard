'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Check, ExternalLink, Eye, EyeOff, Inbox, X } from 'lucide-react'
import { resolveIcon, type IconKey } from '@/lib/icons'
import { IconPicker } from './IconPicker'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { resolveMinMonthlyPaymentOnSave } from '@/lib/creditors'
import {
  findCategoryByName,
  getFallbackCategory,
  resolveCreditorCategoryName,
  sortCategoriesForDropdown,
} from '@/lib/category-definitions'
import type { CategoryDefinition, Creditor } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { formatMoneyInputDraft, parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NEW_CATEGORY_VALUE = '__new__'

function displayCategory(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living' || normalized === 'living expenses') return 'Living Expenses'
  if (normalized === 'subscriptions') return 'Subscriptions'
  if (normalized === 'savings') return 'Savings'
  if (normalized === 'creditors' || normalized === 'credit cards') return 'Credit Cards'
  return category
}

type ExpenseEditFormProps = {
  creditor: Creditor
  categories: CategoryDefinition[]
  onCategoryCreate: (category: string) => void
  onSave: (changes: Partial<Creditor>) => void
  onCancel: () => void
  onArchive?: () => void
  onToggleMute?: () => void
  muted?: boolean
  mode?: 'edit' | 'create'
  /** When true, save/cancel render in the parent shell footer instead of inside the form. */
  shellFooter?: boolean
  /** Required with shellFooter — links external footer buttons to this form. */
  formId?: string
  /** When nested under a create-form card header, drop the top divider. */
  embeddedInShell?: boolean
}

export function dueToPattern(dueDay: Creditor['dueDay']): string {
  if (typeof dueDay === 'number') return `*/${dueDay}`
  return ''
}

function readDueDay(creditor: Creditor): Creditor['dueDay'] {
  if (creditor.dueDay !== undefined) return creditor.dueDay
  if (!creditor.dueDatePattern) return null
  if (creditor.dueDatePattern.toUpperCase() === 'ASAP') return 'asap'
  const match = /\/(\d{1,2})$/.exec(creditor.dueDatePattern)
  return match ? Number(match[1]) : null
}

export function normalizeWebsiteInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, '').replace(/^\/+/, '')
  if (withoutProtocol.toLowerCase().startsWith('www.')) return withoutProtocol
  return `www.${withoutProtocol}`
}

function optionalCurrencyDraft(value?: number | null): string {
  if (value === undefined || value === null || value === 0) return ''
  if (!Number.isFinite(value)) return ''
  return formatCurrency(value)
}

function optionalNumber(raw: string): number | undefined {
  const parsed = parseMoneyInput(raw)
  return parsed ?? undefined
}

function parsePercentInput(raw: string): number | undefined {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return undefined
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

function requiredDebtCurrencySave(raw: string, current?: number): number {
  const parsed = parseMoneyInput(raw)
  if (parsed !== null) return parsed
  if (!raw.trim() && typeof current === 'number') return current
  return 0
}

function parsePercentPreservingZero(raw: string, current?: number): number | undefined {
  if (!raw.trim() && current === 0) return 0
  return parsePercentInput(raw)
}

export function ExpenseEditForm({
  creditor,
  categories,
  onCategoryCreate,
  onSave,
  onCancel,
  onArchive,
  onToggleMute,
  muted = false,
  mode = 'edit',
  shellFooter = false,
  formId,
  embeddedInShell = false,
}: ExpenseEditFormProps) {
  const initialDueDay = readDueDay(creditor)
  const [name, setName] = useState(creditor.name)
  const [amount, setAmount] = useState(formatCurrency(creditor.defaultAmount))
  const [dueMode, setDueMode] = useState<'day' | 'varies' | 'none'>(
    typeof initialDueDay === 'number'
      ? 'day'
      : initialDueDay === 'varies'
        ? 'varies'
        : mode === 'create'
          ? 'day'
          : 'none'
  )
  const [dueDay, setDueDay] = useState(
    typeof initialDueDay === 'number' ? String(initialDueDay) : mode === 'create' ? '1' : ''
  )
  const [accountLastFour, setAccountLastFour] = useState(creditor.accountLastFour ?? '')
  const [url, setUrl] = useState(creditor.url ?? creditor.website ?? '')
  const [category, setCategory] = useState(() =>
    displayCategory(resolveCreditorCategoryName(creditor, categories))
  )
  const [newCategory, setNewCategory] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [trackDebt, setTrackDebt] = useState(Boolean(creditor.trackDebt))
  const [debtType, setDebtType] = useState<'revolving' | 'installment'>(creditor.debtDetail?.type ?? 'revolving')
  const [debtBalanceOwed, setDebtBalanceOwed] = useState(optionalCurrencyDraft(creditor.debtDetail?.balanceOwed))
  const [debtMinPayment, setDebtMinPayment] = useState(optionalCurrencyDraft(creditor.debtDetail?.minMonthlyPayment))
  const [debtCreditLimit, setDebtCreditLimit] = useState(optionalCurrencyDraft(creditor.debtDetail?.creditLimit))
  // Auto-derive available credit when the field hasn't been saved yet but limit + balance are both present.
  const autoAvailableCredit: number | undefined =
    creditor.debtDetail?.availableCredit == null &&
    typeof creditor.debtDetail?.creditLimit === 'number' &&
    typeof creditor.debtDetail?.balanceOwed === 'number'
      ? creditor.debtDetail.creditLimit - creditor.debtDetail.balanceOwed
      : undefined
  const [debtAvailableCredit, setDebtAvailableCredit] = useState(
    optionalCurrencyDraft(creditor.debtDetail?.availableCredit ?? autoAvailableCredit)
  )
  const [debtApr, setDebtApr] = useState(
    typeof creditor.debtDetail?.apr === 'number' && creditor.debtDetail.apr !== 0 ? String(creditor.debtDetail.apr) : ''
  )
  const [icon, setIcon] = useState(creditor.icon ?? '')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const newCategoryRef = useRef<HTMLInputElement>(null)
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  const availableCreditManuallyEdited = useRef(false)

  const categoryOptions = useMemo(() => {
    const sorted = sortCategoriesForDropdown(categories, 'expense')
    return sorted.map(category => category.name)
  }, [categories])

  useEffect(() => {
    if (!creatingCategory) return
    queueMicrotask(() => newCategoryRef.current?.focus())
  }, [creatingCategory])

  useEffect(() => {
    if (mode !== 'create') return
    queueMicrotask(() => nameInputRef.current?.focus())
  }, [mode])

  const startNewCategory = () => {
    setNewCategory('')
    setCategoryError('')
    setCreatingCategory(true)
  }

  const cancelNewCategory = () => {
    setNewCategory('')
    setCategoryError('')
    setCreatingCategory(false)
  }

  const confirmNewCategory = () => {
    const next = newCategory.trim()
    if (!next) return
    if (categoryOptions.some(option => option.toLowerCase() === next.toLowerCase())) {
      setCategoryError('Category already exists')
      return
    }
    onCategoryCreate(next)
    setCategory(next)
    setCategoryError('')
    setCreatingCategory(false)
  }

  // Snapshot of every editable field; lets us detect whether the user actually
  // changed anything (raw inputs, so category normalization can't false-trigger).
  const formSignature = JSON.stringify([
    name,
    amount,
    dueMode,
    dueDay,
    accountLastFour,
    url,
    category,
    trackDebt,
    debtType,
    debtBalanceOwed,
    debtMinPayment,
    debtAvailableCredit,
    debtCreditLimit,
    debtApr,
    icon,
  ])
  const initialSignatureRef = useRef(formSignature)

  const recalcAvailableCredit = () => {
    if (availableCreditManuallyEdited.current) return
    const limit = parseMoneyInput(debtCreditLimit)
    if (limit === null) return
    const owed = parseMoneyInput(debtBalanceOwed) ?? 0
    setDebtAvailableCredit(formatCurrency(limit - owed))
  }

  const save = () => {
    // Nothing edited on an existing row — close quietly, no save/flash.
    // Exception: bypass when an auto-computed available credit hasn't been persisted yet.
    const hasUnpersistedAutoValue = autoAvailableCredit !== undefined && creditor.debtDetail?.availableCredit == null
    if (mode === 'edit' && formSignature === initialSignatureRef.current && !hasUnpersistedAutoValue) {
      onCancel()
      return
    }

    const plannedAmount = parseMoneyInput(amount) ?? creditor.defaultAmount
    const selectedCategory =
      category === NEW_CATEGORY_VALUE ? newCategory.trim() || String(creditor.category) : category
    const matchedCategory =
      findCategoryByName(categories, 'expense', selectedCategory) ??
      getFallbackCategory(categories, 'expense')
    const fallbackName = mode === 'create' ? 'New Bill' : creditor.name
    const nextDueDay: Creditor['dueDay'] =
      dueMode === 'day'
        ? Math.min(31, Math.max(1, Number.parseInt(dueDay, 10) || 1))
        : dueMode === 'varies'
          ? 'varies'
          : null
    const savedBalanceOwed = requiredDebtCurrencySave(debtBalanceOwed, creditor.debtDetail?.balanceOwed)
    const savedCreditLimit = optionalNumber(debtCreditLimit)
    const manualAvailableCredit = optionalNumber(debtAvailableCredit)
    const resolvedAvailableCredit =
      manualAvailableCredit !== undefined
        ? manualAvailableCredit
        : typeof savedCreditLimit === 'number'
          ? savedCreditLimit - savedBalanceOwed
          : undefined
    if (resolvedAvailableCredit !== undefined && resolvedAvailableCredit !== (manualAvailableCredit ?? autoAvailableCredit)) {
      setDebtAvailableCredit(optionalCurrencyDraft(resolvedAvailableCredit))
    }
    const nextDebtDetail =
      trackDebt || creditor.debtDetail || debtBalanceOwed || debtMinPayment || debtAvailableCredit || debtCreditLimit || debtApr
        ? {
            type: debtType,
            balanceOwed: savedBalanceOwed,
            minMonthlyPayment: resolveMinMonthlyPaymentOnSave(
              plannedAmount,
              debtMinPayment,
              creditor.debtDetail?.minMonthlyPayment
            ),
            availableCredit: resolvedAvailableCredit,
            creditLimit: savedCreditLimit,
            apr: parsePercentPreservingZero(debtApr, creditor.debtDetail?.apr),
          }
        : undefined

    onSave({
      name: name.trim() || fallbackName,
      defaultAmount: plannedAmount,
      dueDay: nextDueDay,
      dueDatePattern: dueToPattern(nextDueDay),
      accountLastFour: accountLastFour.replace(/\D/g, '').slice(0, 4) || undefined,
      url: normalizeWebsiteInput(url) || undefined,
      website: normalizeWebsiteInput(url) || undefined,
      category: matchedCategory.name as Creditor['category'],
      categoryId: matchedCategory.id,
      icon: icon || undefined,
      trackDebt,
      debtDetail: nextDebtDetail,
    })
  }

  const inputClass = cn(
    'field-control h-9 w-full border border-[--module-divider-color] px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary)',
    mode === 'create' ? 'focus:border-(--green)' : 'focus:border-(--navy)'
  )
  const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[12px] font-medium tracking-normal text-(--text-secondary)'
  const formContentClass = ''
  const debtGridClass = 'grid grid-cols-1 gap-x-6 gap-y-4 pt-1 sm:grid-cols-2'
  const { Icon: ResolvedIcon, key: resolvedIconKey } = resolveIcon(icon || undefined, category)
  const canManageExisting = mode === 'edit' && typeof onArchive === 'function'
  const showInlineFooter = !shellFooter
  const Root = formId ? 'form' : 'div'
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    save()
  }

  return (
    <Root
      {...(formId
        ? { id: formId, onSubmit: handleSubmit }
        : {})}
      className={cn(
        'bg-[color-mix(in_srgb,var(--bg-secondary)_60%,transparent)] px-5 py-5',
        !embeddedInShell && 'border-t border-[--module-divider-color]'
      )}
    >
      <div className="max-w-3xl space-y-5">
        {/* Two-column layout: left = main fields, right = debt tracker */}
        <div className="flex flex-col gap-x-10 sm:flex-row">

          {/* Left column — main form fields, fixed width so fields don't stretch */}
          <div className="w-full shrink-0 space-y-5 sm:w-[370px]">
            {/* Icon — own row so it doesn't throw off alignment of the fields below */}
            <div className={cn(labelClass, 'w-fit')}>
              <span>Icon</span>
              <div className="relative">
                <button
                  ref={iconButtonRef}
                  type="button"
                  onClick={() => setIconPickerOpen(o => !o)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-(--bg-secondary) transition-colors hover:brightness-95"
                  aria-label="Change icon"
                >
                  <ResolvedIcon className="size-4 text-(--text-primary)" />
                </button>
                {iconPickerOpen && (
                  <IconPicker
                    selected={resolvedIconKey}
                    onSelect={(key: IconKey) => setIcon(key)}
                    onClose={() => setIconPickerOpen(false)}
                    anchorRef={iconButtonRef}
                  />
                )}
              </div>
            </div>

            {/* Bill name + Amount */}
            <div className="flex items-start gap-3">
              <label className={cn(labelClass, 'min-w-0 flex-1')}>
                <span>Bill name</span>
                <input
                  ref={nameInputRef}
                  className={inputClass}
                  value={name}
                  placeholder="Name this bill"
                  onChange={e => setName(e.target.value)}
                />
              </label>
              <label className={cn(labelClass, 'w-28 shrink-0')}>
                <span>Amount</span>
                <div className="relative">
                  <input className={cn(inputClass, 'pr-9')} value={amount} onChange={e => setAmount(e.target.value)} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-(--text-tertiary)">
                    /mo
                  </span>
                </div>
              </label>
            </div>

            {/* Category + Last four */}
            <div className="flex items-start gap-3">
              <label className={cn(labelClass, 'min-w-0 flex-1')}>
                <span>Category</span>
                {creatingCategory ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={newCategoryRef}
                        className={inputClass}
                        value={newCategory}
                        placeholder="Category name…"
                        onChange={e => {
                          setNewCategory(e.target.value)
                          setCategoryError('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            confirmNewCategory()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelNewCategory()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={confirmNewCategory}
                        disabled={!newCategory.trim()}
                        className={cn(
                          'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-input border shadow-(--shadow-sm) transition duration-200 ease-out disabled:cursor-default disabled:opacity-40',
                          newCategory.trim()
                            ? 'border-(--green) bg-(--green-light) text-(--green) hover:bg-(--green) hover:text-white'
                            : 'border-[--module-divider-color] bg-(--bg-primary) text-(--text-secondary) hover:bg-(--bg-secondary)'
                        )}
                        aria-label="Add category"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelNewCategory}
                        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-input border border-[--module-divider-color] bg-(--bg-primary) text-(--text-tertiary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary)"
                        aria-label="Cancel new category"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {categoryError && <p className="mt-1 text-[11px] normal-case tracking-normal text-(--danger-muted)">{categoryError}</p>}
                  </div>
                ) : (
                  <Select
                    value={category}
                    onValueChange={value => {
                      if (value === NEW_CATEGORY_VALUE) {
                        startNewCategory()
                        return
                      }
                      setCategory(value)
                    }}
                  >
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
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
                        <SelectItem value={NEW_CATEGORY_VALUE} className="py-3">
                          + New category
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </label>
              <div className="w-28 shrink-0">
                <label className={cn(labelClass, 'w-20')}>
                  <span>Last four</span>
                  <input
                    className={inputClass}
                    value={accountLastFour}
                    maxLength={4}
                    onChange={e => setAccountLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </label>
              </div>
            </div>

            {/* Due date + Day */}
            <div className="flex items-start gap-3">
              <label className={cn(labelClass, 'w-36 shrink-0')}>
                <span>Due date</span>
                <select className={inputClass} value={dueMode} onChange={e => setDueMode(e.target.value as typeof dueMode)}>
                  <option value="day">Day of month</option>
                  <option value="varies">Varies</option>
                  <option value="none">Blank</option>
                </select>
              </label>
              {dueMode === 'day' && (
                <label className={cn(labelClass, 'w-20 shrink-0')}>
                  <span>Day</span>
                  <input
                    className={cn(inputClass, 'tabular-nums')}
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={e => setDueDay(e.target.value)}
                  />
                </label>
              )}
            </div>

            {/* Website */}
            <div className="flex items-start gap-3">
              <label className={cn(labelClass, 'min-w-0 flex-1')}>
                <div className="flex items-center gap-1">
                  <span>Website</span>
                  <ExternalLink className="size-3 text-(--text-tertiary)" strokeWidth={2.5} aria-hidden />
                </div>
                <input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} />
              </label>
              <div className="w-28 shrink-0" aria-hidden />
            </div>
          </div>

          {/* Right column — debt tracker */}
          <div className="mt-6 min-w-0 flex-1 space-y-4 sm:mt-0 sm:pl-10">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-(--text-secondary) transition duration-200 ease-out hover:text-(--text-primary)">
                <input
                  type="checkbox"
                  checked={trackDebt}
                  onChange={e => setTrackDebt(e.target.checked)}
                  aria-label="Track in Debt Tracker"
                  className="size-4 accent-(--navy)"
                />
                <span>Track in</span>
              </label>
              <Link
                href={DASHBOARD_PATHS.debtTracker}
                className="text-[13px] font-medium text-(--text-tertiary) underline decoration-[color-mix(in_srgb,var(--text-tertiary)_40%,transparent)] underline-offset-2 transition duration-200 ease-out hover:text-(--navy) hover:decoration-(--navy)"
              >
                Debt Tracker
              </Link>
            </div>

            {/* Debt detail fields — collapsible */}
            <div
              className={cn(
                'overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
                trackDebt ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                <label className={labelClass}>
                  <span>Balance Owed</span>
                  <input
                    className={inputClass}
                    placeholder="$0.00"
                    value={debtBalanceOwed}
                    onChange={e => setDebtBalanceOwed(e.target.value)}
                    onBlur={() => { setDebtBalanceOwed(formatMoneyInputDraft(debtBalanceOwed)); recalcAvailableCredit() }}
                  />
                </label>
                <label className={labelClass}>
                  <span>Min Payment</span>
                  <input
                    className={inputClass}
                    placeholder="$0.00"
                    value={debtMinPayment}
                    onChange={e => setDebtMinPayment(e.target.value)}
                  />
                </label>
                <label className={labelClass}>
                  <span>Available Credit</span>
                  <input
                    className={inputClass}
                    placeholder="$0.00"
                    value={debtAvailableCredit}
                    onChange={e => { availableCreditManuallyEdited.current = true; setDebtAvailableCredit(e.target.value) }}
                  />
                </label>
                <label className={labelClass}>
                  <span>Credit Limit</span>
                  <input
                    className={inputClass}
                    placeholder="$0.00"
                    value={debtCreditLimit}
                    onChange={e => setDebtCreditLimit(e.target.value)}
                    onBlur={() => { setDebtCreditLimit(formatMoneyInputDraft(debtCreditLimit)); recalcAvailableCredit() }}
                  />
                </label>
                <label className={labelClass}>
                  <span>Type</span>
                  <select className={inputClass} value={debtType} onChange={e => setDebtType(e.target.value as typeof debtType)}>
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
                    value={debtApr}
                    onChange={e => setDebtApr(e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

        </div>

        {showInlineFooter && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] pt-4',
              mode === 'create' && 'justify-end'
            )}
          >
            {canManageExisting && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-(--text-secondary) transition duration-200 ease-out hover:text-(--navy)"
                >
                  {muted ? <Eye className="size-3.5 shrink-0" strokeWidth={2} aria-hidden /> : <EyeOff className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />}
                  {muted ? 'Unmute bill' : 'Mute bill'}
                </button>
                <button
                  type="button"
                  onClick={onArchive}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-(--text-secondary) transition duration-200 ease-out hover:text-(--navy)"
                >
                  <Inbox className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  Archive bill
                </button>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="cursor-pointer text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center rounded-input px-3 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out',
                  mode === 'create' ? 'bg-(--green) hover:bg-(--green-dark)' : 'bg-(--navy) hover:bg-(--navy-dark)'
                )}
              >
                {mode === 'create' ? 'Save Bill' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Root>
  )
}
