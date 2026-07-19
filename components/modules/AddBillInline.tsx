'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, X } from 'lucide-react'
import { categoryDisplayName, plannedMonthlyPayment } from '@/lib/creditors'
import {
  getFallbackCategory,
  isFallbackCategory,
  sortCategoriesForInlineBillAdd,
} from '@/lib/category-definitions'
import type { Bill, CategoryDefinition, Creditor } from '@/lib/types'
import {
  ASAP_DUE_DATE,
  formatDueDateDisplay,
  formatRecurringDueDateDisplay,
  isAsapDueDate,
} from '@/lib/due-date'
import { DueDateField } from './DueDateField'
import { parseMoneyInput } from '@/lib/money-input'
import { formatCurrency, generateId } from '@/lib/format'
import { cn, useIsClient } from '@/lib/utils'
import { AmountInput } from '@/components/shared/AmountInput'
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

export type AddBillInlineProps = {
  open: boolean
  boardMonth: number
  boardYear: number
  creditors: Creditor[]
  expenseCategoryDefinitions: CategoryDefinition[]
  onCategoryCreate?: (category: string) => void
  /** Template editor: show due date as day-of-month only */
  dueDateDayOnly?: boolean
  onCancel: () => void
  onAdd: (bill: Bill) => void
  /** Notifies parent when custom category text is typed but not committed with Enter. */
  onUnsavedCategoryChange?: (hasUnsaved: boolean) => void
}

export function AddBillInline({
  open,
  boardMonth,
  boardYear,
  creditors,
  expenseCategoryDefinitions,
  onCategoryCreate,
  dueDateDayOnly = false,
  onCancel,
  onAdd,
  onUnsavedCategoryChange,
}: AddBillInlineProps) {
  const [mode, setMode] = useState<'master' | 'oneoff'>('master')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [creditorId, setCreditorId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [due, setDue] = useState('')
  const [amount, setAmount] = useState('')
  const defaultCategoryName = useMemo(
    () => getFallbackCategory(expenseCategoryDefinitions, 'expense').name,
    [expenseCategoryDefinitions]
  )
  const [category, setCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const masterBtnRef = useRef<HTMLButtonElement>(null)
  const masterListRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const newCategoryRef = useRef<HTMLInputElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [masterListPos, setMasterListPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const mounted = useIsClient()

  const resetForm = useCallback(() => {
    setMode('master')
    setDropdownOpen(false)
    setCreditorId(null)
    setName('')
    setDue('')
    setAmount('')
    setCategory(defaultCategoryName)
    setNewCategory('')
    setCreatingCategory(false)
    setCategoryError('')
    setCategorySelectOpen(false)
  }, [defaultCategoryName])

  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open && !prevOpenRef.current) resetForm()
    prevOpenRef.current = open
  }, [open, resetForm])

  useEffect(() => {
    if (mode === 'oneoff') nameInputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    if (!creatingCategory) return
    queueMicrotask(() => newCategoryRef.current?.focus())
  }, [creatingCategory])

  useLayoutEffect(() => {
    if (!dropdownOpen || !masterBtnRef.current) return
    const update = () => {
      const btn = masterBtnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      setMasterListPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [dropdownOpen])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node
      const inWrap = wrapRef.current?.contains(target)
      const inList = masterListRef.current?.contains(target)
      const onBtn = masterBtnRef.current?.contains(target)
      if (inWrap || inList || onBtn) return
      setDropdownOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [dropdownOpen, open])

  const selectedCreditor = creditorId ? creditors.find(c => c.id === creditorId) : undefined
  const sortedCategories = useMemo(
    () => sortCategoriesForInlineBillAdd(expenseCategoryDefinitions, 'expense'),
    [expenseCategoryDefinitions]
  )
  const fallbackCategory = sortedCategories.find(isFallbackCategory)
  const otherCategories = sortedCategories.filter(category => !isFallbackCategory(category))
  const categoryOptionNames = useMemo(
    () => sortedCategories.map(category => category.name),
    [sortedCategories]
  )
  const hasUnsavedCategory = creatingCategory && newCategory.trim().length > 0

  useEffect(() => {
    onUnsavedCategoryChange?.(hasUnsavedCategory)
    return () => onUnsavedCategoryChange?.(false)
  }, [hasUnsavedCategory, onUnsavedCategoryChange])

  const startNewCategory = () => {
    setCategorySelectOpen(false)
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
    const normalized = categoryDisplayName(next)
    if (categoryOptionNames.some(option => option.toLowerCase() === normalized.toLowerCase())) {
      setCategoryError('Category already exists')
      return
    }
    onCategoryCreate?.(normalized)
    setCategory(normalized)
    setNewCategory('')
    setCategoryError('')
    setCreatingCategory(false)
  }

  const creditorDueDisplay = (creditor: Creditor): string => {
    if (typeof creditor.dueDay === 'number') return `*/${creditor.dueDay}`
    if (creditor.dueDay === 'asap') return 'ASAP'
    if (creditor.dueDay === 'varies') return 'Varies'
    return formatRecurringDueDateDisplay(creditor.dueDatePattern)
  }

  const creditorsByInitial = [...creditors]
    .sort((a, z) => a.name.localeCompare(z.name))
    .reduce<Array<{ initial: string; items: Creditor[] }>>((groups, creditor) => {
      const initial = creditor.name.trim().charAt(0).toUpperCase() || '#'
      const last = groups.at(-1)
      if (last?.initial === initial) {
        last.items.push(creditor)
        return groups
      }
      groups.push({ initial, items: [creditor] })
      return groups
    }, [])

  const commit = () => {
    if (hasUnsavedCategory) return
    const parsedAmount = parseMoneyInput(amount)
    const masterCreditor = mode === 'master' ? selectedCreditor : undefined
    const trimmedName = masterCreditor?.name ?? name.trim()
    if (!trimmedName) return

    const bill: Bill = {
      id: generateId('bill'),
      name: trimmedName,
      amount: parsedAmount ?? 0,
      dueDate: isAsapDueDate(due)
        ? ASAP_DUE_DATE
        : due
          ? formatDueDateDisplay(due, boardMonth)
          : '',
      paid: false,
      muted: false,
      notes: '',
      category: mode === 'oneoff' ? category || defaultCategoryName : undefined,
      origin: mode === 'master' ? 'master' : 'oneoff',
      creditorId: masterCreditor?.id,
      promotedToMaster: false,
    }
    onAdd(bill)
    onCancel()
  }

  const onKeyDownContainer = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (creatingCategory) {
        confirmNewCategory()
        return
      }
      if (hasUnsavedCategory) return
      commit()
    }
  }

  return (
    <div ref={wrapRef} className="add-bill-panel" data-open={open ? 'true' : 'false'}>
      <div className="add-bill-panel__clip">
        <div className="add-bill-form" onKeyDown={onKeyDownContainer}>
          <div className="add-bill-form__fields">
            {mode === 'master' ? (
              <div className="add-bill-form__creditor relative min-w-[10rem] flex-1">
                <button
                  ref={masterBtnRef}
                  type="button"
                  className="field-control flex h-8 w-full items-center justify-between border border-border px-2 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-secondary)"
                  onClick={() => setDropdownOpen(o => !o)}
                >
                  <span className="truncate text-(--text-secondary)">
                    {selectedCreditor?.name ?? 'Select a bill'}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" />
                </button>
                {dropdownOpen &&
                  mounted &&
                  masterListPos &&
                  createPortal(
                    <div
                      ref={masterListRef}
                      className="scrollbar-thin fixed z-70 overflow-y-auto rounded-lg border border-border bg-(--bg-primary) shadow-lg"
                      style={{
                        top: masterListPos.top,
                        left: masterListPos.left,
                        width: masterListPos.width,
                        maxHeight: Math.min(220, window.innerHeight - masterListPos.top - 12),
                      }}
                    >
                      <div className="py-1">
                        {creditorsByInitial.map(group => (
                          <div key={group.initial}>
                            <div className="px-2 pb-0.5 pt-2 text-[11px] font-medium text-(--text-tertiary)">
                              {group.initial}
                            </div>
                            {group.items.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className="flex w-full cursor-pointer items-center gap-3 px-2 py-1.5 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-tertiary)"
                                onClick={() => {
                                  setCreditorId(c.id)
                                  setName(c.name)
                                  setAmount(formatCurrency(plannedMonthlyPayment(c)))
                                  setDue(
                                    typeof c.dueDay === 'number'
                                      ? `*/${c.dueDay}`
                                      : c.dueDay === 'asap'
                                        ? ASAP_DUE_DATE
                                        : c.dueDay === 'varies'
                                          ? 'Varies'
                                          : c.dueDatePattern
                                  )
                                  setDropdownOpen(false)
                                }}
                              >
                                <span className="min-w-0 flex-1 truncate text-(--text-secondary)">
                                  {c.name}
                                </span>
                                <span className="w-10 shrink-0 text-right tabular-nums text-(--text-tertiary)">
                                  {creditorDueDisplay(c)}
                                </span>
                                <span className="w-14 shrink-0 text-right tabular-nums text-(--text-tertiary)">
                                  {formatCurrency(plannedMonthlyPayment(c))}
                                </span>
                              </button>
                            ))}
                          </div>
                        ))}
                        {creditors.length === 0 && (
                          <div className="px-2 py-3 text-[12px] text-(--text-tertiary)">No creditors yet.</div>
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
              </div>
            ) : (
              <>
                <input
                  ref={nameInputRef}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Bill name"
                  className="add-bill-form__input h-8 min-w-[8.75rem] flex-1"
                />
                <div className="flex min-w-[8.75rem] items-center gap-1">
                  {creatingCategory ? (
                    <>
                      <input
                        ref={newCategoryRef}
                        value={newCategory}
                        placeholder="Category name…"
                        className="add-bill-form__input h-8 min-w-0 flex-1"
                        onChange={e => {
                          setNewCategory(e.target.value)
                          setCategoryError('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            e.stopPropagation()
                            confirmNewCategory()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            e.stopPropagation()
                            cancelNewCategory()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={cancelNewCategory}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-input border border-border text-(--text-tertiary) hover:bg-(--bg-tertiary)"
                        aria-label="Cancel new category"
                      >
                        <X className="size-3.5" />
                      </button>
                      {categoryError ? (
                        <span className="shrink-0 whitespace-nowrap text-[10px] text-(--danger-muted)">
                          {categoryError}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <Select
                      open={categorySelectOpen}
                      onOpenChange={setCategorySelectOpen}
                      value={category}
                      onValueChange={setCategory}
                    >
                      <SelectTrigger className="add-bill-form__input h-8 min-w-[8.75rem] shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {fallbackCategory ? (
                          <SelectItem key={fallbackCategory.id} value={fallbackCategory.name}>
                            {fallbackCategory.name}
                          </SelectItem>
                        ) : null}
                        {fallbackCategory && otherCategories.length > 0 ? <SelectSeparator /> : null}
                        {otherCategories.map(option => (
                          <SelectItem key={option.id} value={option.name}>
                            {option.name}
                          </SelectItem>
                        ))}
                        {onCategoryCreate ? (
                          <>
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
                                  startNewCategory()
                                }}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-input py-2 pl-2 pr-2 text-[13px] text-(--text-primary) outline-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary)"
                              >
                                + New category
                              </button>
                            </SelectGroup>
                          </>
                        ) : null}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}

            <DueDateField
              value={due}
              boardMonth={boardMonth}
              boardYear={boardYear}
              onChange={setDue}
              placeholder="Due date"
              dayOnly={dueDateDayOnly}
            />
            <AmountInput
              ref={amountInputRef}
              value={amount}
              onChange={setAmount}
              className="add-bill-form__input add-bill-amount-input inline-currency-input h-8 w-[6rem] shrink-0"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  amountInputRef.current?.blur()
                }
              }}
            />
            <button
              type="button"
              className={cn(
                'btn-green inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 px-3 text-[13px] font-medium',
                hasUnsavedCategory && 'cursor-not-allowed opacity-40'
              )}
              disabled={hasUnsavedCategory}
              onClick={commit}
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </button>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-input border border-border text-(--text-tertiary) hover:bg-(--bg-tertiary)"
              aria-label="Cancel"
              onClick={onCancel}
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex gap-1">
            {(['master', 'oneoff'] as const).map(segment => (
              <button
                key={segment}
                type="button"
                onClick={() => {
                  if (mode === segment) return
                  setMode(segment)
                  setCreditorId(null)
                  setDropdownOpen(false)
                  setDue('')
                  setCategory(defaultCategoryName)
                  cancelNewCategory()
                  if (mode === 'oneoff') {
                    setName('')
                    setAmount('')
                  }
                }}
                className={`cursor-pointer rounded-input px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                  mode === segment
                    ? 'bg-(--navy)/10 text-(--navy)'
                    : 'text-(--text-tertiary) hover:text-(--text-secondary)'
                }`}
              >
                {segment === 'master' ? 'Bills' : 'Custom'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
