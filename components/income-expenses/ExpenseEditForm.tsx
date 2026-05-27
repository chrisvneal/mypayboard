'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Creditor } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'

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
  categories: string[]
  onCategoryCreate: (category: string) => void
  onSave: (changes: Partial<Creditor>) => void
  onCancel: () => void
  onArchive?: () => void
  onDelete?: () => void
  mode?: 'edit' | 'create'
}

function dueToPattern(dueDay: Creditor['dueDay']): string {
  if (typeof dueDay === 'number') return `*/${dueDay}`
  if (dueDay === 'asap') return 'ASAP'
  return ''
}

function readDueDay(creditor: Creditor): Creditor['dueDay'] {
  if (creditor.dueDay !== undefined) return creditor.dueDay
  if (!creditor.dueDatePattern) return null
  if (creditor.dueDatePattern.toUpperCase() === 'ASAP') return 'asap'
  const match = /\/(\d{1,2})$/.exec(creditor.dueDatePattern)
  return match ? Number(match[1]) : null
}

function normalizeWebsiteInput(raw: string): string {
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

function promoDateDraft(value?: string): string {
  const raw = value ?? ''
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (iso) return raw

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw)
  if (!slash) return ''
  return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`
}

export function ExpenseEditForm({
  creditor,
  categories,
  onCategoryCreate,
  onSave,
  onCancel,
  onArchive,
  onDelete,
  mode = 'edit',
}: ExpenseEditFormProps) {
  const initialDueDay = readDueDay(creditor)
  const [name, setName] = useState(creditor.name)
  const [amount, setAmount] = useState(formatCurrency(creditor.defaultAmount))
  const [dueMode, setDueMode] = useState<'day' | 'varies' | 'asap' | 'none'>(
    typeof initialDueDay === 'number'
      ? 'day'
      : initialDueDay === 'varies'
        ? 'varies'
        : initialDueDay === 'asap'
          ? 'asap'
          : 'none'
  )
  const [dueDay, setDueDay] = useState(typeof initialDueDay === 'number' ? String(initialDueDay) : '')
  const [accountLastFour, setAccountLastFour] = useState(creditor.accountLastFour ?? '')
  const [url, setUrl] = useState(creditor.url ?? creditor.website ?? '')
  const [category, setCategory] = useState(displayCategory(String(creditor.category)))
  const [newCategory, setNewCategory] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [trackDebt, setTrackDebt] = useState(Boolean(creditor.trackDebt))
  const [debtType, setDebtType] = useState<'revolving' | 'installment'>(creditor.debtDetail?.type ?? 'revolving')
  const [debtBalanceOwed, setDebtBalanceOwed] = useState(optionalCurrencyDraft(creditor.debtDetail?.balanceOwed))
  const [debtMinPayment, setDebtMinPayment] = useState(optionalCurrencyDraft(creditor.debtDetail?.minMonthlyPayment))
  const [debtAvailableCredit, setDebtAvailableCredit] = useState(optionalCurrencyDraft(creditor.debtDetail?.availableCredit))
  const [debtCreditLimit, setDebtCreditLimit] = useState(optionalCurrencyDraft(creditor.debtDetail?.creditLimit))
  const [debtApr, setDebtApr] = useState(
    typeof creditor.debtDetail?.apr === 'number' && creditor.debtDetail.apr !== 0 ? String(creditor.debtDetail.apr) : ''
  )
  const [debtPromoEndDate, setDebtPromoEndDate] = useState(promoDateDraft(creditor.debtDetail?.promoEndDate))
  const nameInputRef = useRef<HTMLInputElement>(null)
  const newCategoryRef = useRef<HTMLInputElement>(null)

  const categoryOptions = useMemo(() => {
    return Array.from(new Set([displayCategory(String(creditor.category)), ...categories].filter(Boolean)))
  }, [categories, creditor.category])

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

  const save = () => {
    const parsedAmount = parseMoneyInput(amount)
    const selectedCategory =
      category === NEW_CATEGORY_VALUE ? newCategory.trim() || String(creditor.category) : category
    const fallbackName = mode === 'create' ? 'New Expense' : creditor.name
    const nextDueDay: Creditor['dueDay'] =
      dueMode === 'day'
        ? Math.min(31, Math.max(1, Number.parseInt(dueDay, 10) || 1))
        : dueMode === 'varies'
          ? 'varies'
          : dueMode === 'asap'
            ? 'asap'
            : null
    const nextDebtDetail =
      trackDebt || creditor.debtDetail || debtBalanceOwed || debtMinPayment || debtAvailableCredit || debtCreditLimit || debtApr || debtPromoEndDate
        ? {
            type: debtType,
            balanceOwed: requiredDebtCurrencySave(debtBalanceOwed, creditor.debtDetail?.balanceOwed),
            minMonthlyPayment: requiredDebtCurrencySave(debtMinPayment, creditor.debtDetail?.minMonthlyPayment),
            availableCredit: optionalNumber(debtAvailableCredit),
            creditLimit: optionalNumber(debtCreditLimit),
            apr: parsePercentPreservingZero(debtApr, creditor.debtDetail?.apr),
            promoEndDate: debtPromoEndDate || undefined,
          }
        : undefined

    onSave({
      name: name.trim() || fallbackName,
      defaultAmount: parsedAmount ?? creditor.defaultAmount,
      dueDay: nextDueDay,
      dueDatePattern: dueToPattern(nextDueDay),
      accountLastFour: accountLastFour.replace(/\D/g, '').slice(0, 4) || undefined,
      url: normalizeWebsiteInput(url) || undefined,
      website: normalizeWebsiteInput(url) || undefined,
      category: selectedCategory,
      trackDebt,
      debtDetail: nextDebtDetail,
    })
  }

  const inputClass = cn(
    'h-9 w-full rounded-lg border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none transition duration-200 ease-out placeholder:text-(--text-tertiary)',
    mode === 'create' ? 'focus:border-(--green)' : 'focus:border-(--navy)'
  )
  const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wider text-(--text-tertiary)'
  const formContentClass = 'mx-auto max-w-[620px]'
  const formGridClass = cn(
    formContentClass,
    'grid gap-x-10 gap-y-4 sm:grid-cols-[minmax(0,280px)_minmax(0,280px)]'
  )
  const debtGridClass = 'grid gap-x-10 gap-y-4 pt-1 sm:grid-cols-[minmax(0,280px)_minmax(0,280px)]'
  const canManageExisting = mode === 'edit' && typeof onArchive === 'function' && typeof onDelete === 'function'

  return (
    <div className="space-y-5 border-t border-[--module-divider-color] bg-[color-mix(in_srgb,var(--bg-secondary)_42%,transparent)] px-5 py-5">
      <div className={formGridClass}>
        <label className={labelClass}>
          <span>Bill name</span>
          <input
            ref={nameInputRef}
            className={inputClass}
            value={name}
            placeholder="Name this expense"
            onChange={e => setName(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          <span>Amount</span>
          <input className={inputClass} value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className={labelClass}>
          <span>Due date</span>
          <select className={inputClass} value={dueMode} onChange={e => setDueMode(e.target.value as typeof dueMode)}>
            <option value="day">Day of month</option>
            <option value="varies">Varies</option>
            <option value="asap">ASAP</option>
            <option value="none">Blank</option>
          </select>
        </label>
        <label className={labelClass}>
          <span>Day</span>
          <input
            className={inputClass}
            type="number"
            min={1}
            max={31}
            value={dueDay}
            disabled={dueMode !== 'day'}
            onChange={e => setDueDay(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          <span>Last four</span>
          <input
            className={inputClass}
            value={accountLastFour}
            maxLength={4}
            onChange={e => setAccountLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
        <label className={labelClass}>
          <span>Website</span>
          <input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} />
        </label>
        <label className={labelClass}>
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
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) text-(--text-secondary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary) disabled:cursor-default disabled:opacity-40"
                  aria-label="Add category"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelNewCategory}
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) text-(--text-tertiary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary)"
                  aria-label="Cancel new category"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {categoryError && <p className="mt-1 text-[11px] normal-case tracking-normal text-(--danger-muted)">{categoryError}</p>}
            </div>
          ) : (
            <select
              className={inputClass}
              value={category}
              onChange={e => {
                if (e.target.value === NEW_CATEGORY_VALUE) {
                  startNewCategory()
                  return
                }
                setCategory(e.target.value)
              }}
            >
              {categoryOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <optgroup label="Custom">
                <option value={NEW_CATEGORY_VALUE}>+ New category</option>
              </optgroup>
            </select>
          )}
        </label>
      </div>

      <div
        className={cn(
          'border-t pt-4 transition-[border-color] duration-200',
          trackDebt
            ? 'border-[color-mix(in_srgb,var(--navy)_38%,var(--module-divider-color))]'
            : 'border-[--module-divider-color]'
        )}
      >
        <div className={cn(formContentClass, 'space-y-3')}>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-(--text-secondary)">
            <input
              type="checkbox"
              checked={trackDebt}
              onChange={e => setTrackDebt(e.target.checked)}
              className="size-4 accent-(--navy)"
            />
            <span>Track in Debt Overview</span>
          </label>

          <div
            className={cn(
              'overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
              trackDebt ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className={debtGridClass}>
              <label className={labelClass}>
                <span>Type</span>
                <select className={inputClass} value={debtType} onChange={e => setDebtType(e.target.value as typeof debtType)}>
                  <option value="revolving">Revolving</option>
                  <option value="installment">Installment</option>
                </select>
              </label>
              <label className={labelClass}>
                <span>Balance Owed</span>
                <input
                  className={inputClass}
                  placeholder="$0.00"
                  value={debtBalanceOwed}
                  onChange={e => setDebtBalanceOwed(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                <span>Min. Monthly Payment</span>
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
                  onChange={e => setDebtAvailableCredit(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                <span>Credit Limit</span>
                <input
                  className={inputClass}
                  placeholder="$0.00"
                  value={debtCreditLimit}
                  onChange={e => setDebtCreditLimit(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                <span>APR</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  placeholder="24.99"
                  value={debtApr}
                  onChange={e => setDebtApr(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                <span>Promo End Date</span>
                <input
                  className={cn(inputClass, 'w-[170px] max-w-full')}
                  type="date"
                  value={debtPromoEndDate}
                  onChange={e => setDebtPromoEndDate(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className={cn(formContentClass, 'flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] pt-4')}>
        <button
          type="button"
          onClick={save}
          className={cn(
            'inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out',
            mode === 'create' ? 'bg-(--green) hover:bg-(--green-dark)' : 'bg-(--navy) hover:bg-(--navy-dark)'
          )}
        >
          {mode === 'create' ? 'Save Expense' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
        >
          Cancel
        </button>
        {canManageExisting && (
        <div className="ml-auto flex items-center gap-3">
          {confirmingDelete ? (
            <>
              <span className="text-[11px] text-(--danger-muted)">Are you sure? This cannot be undone.</span>
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer text-[12px] font-medium text-(--danger-muted)"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="cursor-pointer text-[12px] text-(--text-tertiary)"
              >
                Keep
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onArchive}
                className="cursor-pointer text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="cursor-pointer text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--danger-muted)"
              >
                Delete
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
