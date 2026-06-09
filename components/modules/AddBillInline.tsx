'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus } from 'lucide-react'
import { plannedMonthlyPayment } from '@/lib/creditors'
import type { Bill, Creditor } from '@/lib/types'
import { ASAP_DUE_DATE, formatDueDateDisplay, isAsapDueDate } from '@/lib/due-date'
import { DueDateField } from './DueDateField'
import { formatMoneyInputDraft, parseMoneyInput } from '@/lib/money-input'
import { formatCurrency, generateId } from '@/lib/format'
import { useIsClient } from '@/lib/utils'

export type AddBillInlineProps = {
  open: boolean
  boardMonth: number
  boardYear: number
  creditors: Creditor[]
  expenseCategories: string[]
  onCancel: () => void
  onAdd: (bill: Bill) => void
}

export function AddBillInline({
  open,
  boardMonth,
  boardYear,
  creditors,
  expenseCategories,
  onCancel,
  onAdd,
}: AddBillInlineProps) {
  const [mode, setMode] = useState<'master' | 'oneoff'>('master')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [creditorId, setCreditorId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [due, setDue] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Miscellaneous')
  const wrapRef = useRef<HTMLDivElement>(null)
  const masterBtnRef = useRef<HTMLButtonElement>(null)
  const masterListRef = useRef<HTMLDivElement>(null)
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
    setCategory('Miscellaneous')
  }, [])

  const prevOpenRef = useRef(open)
  useEffect(() => {
    if (open && !prevOpenRef.current) resetForm()
    prevOpenRef.current = open
  }, [open, resetForm])

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
  const categoryOptions = Array.from(new Set([...expenseCategories, 'Miscellaneous']))
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

  const formatAmountField = () => {
    setAmount(formatMoneyInputDraft(amount))
  }

  const commit = () => {
    const parsedAmount = parseMoneyInput(amount)
    const masterCreditor = mode === 'master' ? selectedCreditor : undefined
    const trimmedName = masterCreditor?.name ?? name.trim()
    if (!trimmedName) return

    const masterDue =
      typeof masterCreditor?.dueDay === 'number'
        ? `*/${masterCreditor.dueDay}`
        : masterCreditor?.dueDay === 'asap'
          ? ASAP_DUE_DATE
          : masterCreditor?.dueDay === 'varies'
            ? 'Varies'
            : masterCreditor?.dueDatePattern ?? ''
    const dueDraft = masterCreditor ? masterDue : due

    const bill: Bill = {
      id: generateId('bill'),
      name: trimmedName,
      amount: masterCreditor ? plannedMonthlyPayment(masterCreditor) : parsedAmount ?? 0,
      dueDate: isAsapDueDate(dueDraft)
        ? ASAP_DUE_DATE
        : dueDraft
          ? formatDueDateDisplay(dueDraft, boardMonth)
          : '',
      paid: false,
      muted: false,
      notes: '',
      category: mode === 'oneoff' ? category || 'Miscellaneous' : undefined,
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
                  className="flex h-8 w-full items-center justify-between rounded-lg border border-border bg-(--bg-primary) px-2 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-secondary)"
                  onClick={() => setDropdownOpen(o => !o)}
                >
                  <span className="truncate text-(--text-secondary)">
                    {selectedCreditor?.name ?? 'Select creditor'}
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
                            <div className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-(--text-tertiary)">
                              {group.initial}
                            </div>
                            {group.items.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-tertiary)"
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
                                <span className="truncate text-(--text-secondary)">{c.name}</span>
                                <span className="shrink-0 tabular-nums text-(--text-tertiary)">
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
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Bill name"
                  className="add-bill-form__input h-8 min-w-[8.75rem] flex-1"
                />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="add-bill-form__input h-8 min-w-[8.75rem]"
                >
                  {categoryOptions.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </>
            )}

            <DueDateField
              value={due}
              boardMonth={boardMonth}
              boardYear={boardYear}
              onChange={setDue}
              placeholder="Due date"
            />
            <input
              ref={amountInputRef}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="$0.00"
              className="add-bill-form__input add-bill-amount-input inline-currency-input h-8 w-[6rem] shrink-0"
              onFocus={e => e.currentTarget.select()}
              onClick={e => e.currentTarget.select()}
              onBlur={formatAmountField}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  formatAmountField()
                  amountInputRef.current?.blur()
                }
              }}
            />
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-(--green) px-3 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-(--green-dark)"
              onClick={commit}
            >
              <Plus className="size-3.5" aria-hidden />
              Add
            </button>
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-(--text-tertiary) hover:bg-(--bg-tertiary)"
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
                  setCategory('Miscellaneous')
                  if (mode === 'oneoff') {
                    setName('')
                    setAmount('')
                  }
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150 ${
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
