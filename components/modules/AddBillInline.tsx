'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus } from 'lucide-react'
import type { Bill, Creditor } from '@/lib/types'
import { ASAP_DUE_DATE, formatDueDateDisplay, isAsapDueDate } from '@/lib/due-date'
import { DueDateField } from './DueDateField'
import { formatMoneyInputDraft, parseMoneyInput } from '@/lib/money-input'
import { formatCurrency, generateId } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

export type AddBillInlineProps = {
  open: boolean
  boardMonth: number
  boardYear: number
  creditors: Creditor[]
  onCancel: () => void
  onAdd: (bill: Bill) => void
}

export function AddBillInline({
  open,
  boardMonth,
  boardYear,
  creditors,
  onCancel,
  onAdd,
}: AddBillInlineProps) {
  const [mode, setMode] = useState<'master' | 'oneoff'>('master')
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [creditorId, setCreditorId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [due, setDue] = useState('')
  const [amount, setAmount] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const masterBtnRef = useRef<HTMLButtonElement>(null)
  const masterListRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const [masterListPos, setMasterListPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  const activeCreditors = useMemo(() => creditors.filter(c => c.active), [creditors])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return activeCreditors
    return activeCreditors.filter(c => c.name.toLowerCase().includes(q))
  }, [activeCreditors, query])

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!dropdownOpen || !masterBtnRef.current) {
      setMasterListPos(null)
      return
    }
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

  const selectedCreditor = creditorId ? activeCreditors.find(c => c.id === creditorId) : undefined

  const resetForm = () => {
    setMode('master')
    setQuery('')
    setDropdownOpen(false)
    setCreditorId(null)
    setName('')
    setDue('')
    setAmount('')
  }

  const cancel = () => {
    resetForm()
    onCancel()
  }

  const formatAmountField = () => {
    setAmount(formatMoneyInputDraft(amount))
  }

  const commit = () => {
    const trimmedName = name.trim()
    const parsedAmount = parseMoneyInput(amount)
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
      origin: mode === 'oneoff' ? 'oneoff' : 'master',
      creditorId: mode === 'master' ? creditorId ?? undefined : undefined,
    }
    onAdd(bill)
    resetForm()
    onCancel()
  }

  const onKeyDownContainer = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        'add-bill-expand',
        open ? 'max-h-[320px] overflow-visible opacity-100' : 'max-h-0 overflow-hidden opacity-0'
      )}
    >
      <div
        className={cn('px-5 pt-3 pb-3', open && 'border-t border-[var(--module-divider-color)]')}
        onKeyDown={onKeyDownContainer}
      >
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'master' ? (
            <div className="relative min-w-[160px] flex-1">
              <button
                ref={masterBtnRef}
                type="button"
                className="flex h-8 w-full items-center justify-between rounded-lg border border-border bg-(--bg-primary) px-2 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-secondary)"
                onClick={() => setDropdownOpen(o => !o)}
              >
                <span className="truncate text-(--text-secondary)">
                  {selectedCreditor?.name ?? 'Search Master List'}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-60" />
              </button>
              {dropdownOpen &&
                mounted &&
                masterListPos &&
                createPortal(
                  <div
                    ref={masterListRef}
                    className="fixed z-[70] overflow-hidden rounded-lg border border-border bg-(--bg-primary) shadow-lg"
                    style={{
                      top: masterListPos.top,
                      left: masterListPos.left,
                      width: masterListPos.width,
                      maxHeight: Math.min(220, window.innerHeight - masterListPos.top - 12),
                    }}
                  >
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search…"
                      className="w-full border-0 border-b border-border px-2 py-2 text-[13px] outline-none"
                    />
                    <div className="scrollbar-thin overflow-y-auto py-1">
                      {filtered.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full px-2 py-1.5 text-left text-[13px] transition-colors duration-150 ease-out hover:bg-(--bg-tertiary)"
                          onClick={() => {
                            setCreditorId(c.id)
                            setName(c.name)
                            setAmount(formatCurrency(c.defaultAmount))
                            setDropdownOpen(false)
                            setQuery('')
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <div className="px-2 py-3 text-[12px] text-(--text-tertiary)">No matches.</div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
            </div>
          ) : (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Bill name"
              className="h-8 min-w-[140px] flex-1 rounded-lg border border-border bg-transparent px-2 text-[13px] outline-none focus:border-(--navy)"
            />
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
            className="inline-currency-input h-8 w-[96px] shrink-0 rounded-lg border border-border bg-transparent px-2 text-left text-[13px] outline-none focus:border-(--navy)"
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-(--green) px-3 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-(--green-dark)"
            onClick={commit}
          >
            <Plus className="size-3.5" aria-hidden />
            Add
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border text-(--text-tertiary) hover:bg-(--bg-tertiary)"
            aria-label="Cancel"
            onClick={cancel}
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          className="mt-2.5 text-[12px] font-medium text-(--navy) hover:underline"
          onClick={() => {
            setMode(m => (m === 'master' ? 'oneoff' : 'master'))
            setCreditorId(null)
            setDropdownOpen(false)
            setDue('')
            if (mode === 'oneoff') {
              setName('')
              setAmount('')
            }
          }}
        >
          {mode === 'master' ? '+ Create one-off instead' : '← Pick from Master List'}
        </button>
      </div>
    </div>
  )
}
