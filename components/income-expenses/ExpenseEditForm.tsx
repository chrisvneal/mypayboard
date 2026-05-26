'use client'

import { useMemo, useState } from 'react'
import type { Creditor } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { parseMoneyInput } from '@/lib/money-input'

const NEW_CATEGORY_VALUE = '__new__'

function displayCategory(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living' || normalized === 'living expenses') return 'Living Expenses'
  if (normalized === 'subscriptions') return 'Subscriptions'
  if (normalized === 'savings') return 'Savings'
  if (normalized === 'creditors') return 'Creditors'
  return category
}

type ExpenseEditFormProps = {
  creditor: Creditor
  categories: string[]
  onSave: (changes: Partial<Creditor>) => void
  onCancel: () => void
  onArchive: () => void
  onDelete: () => void
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

export function ExpenseEditForm({
  creditor,
  categories,
  onSave,
  onCancel,
  onArchive,
  onDelete,
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
  const [muted, setMuted] = useState(Boolean(creditor.muted))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const categoryOptions = useMemo(() => {
    return Array.from(new Set([displayCategory(String(creditor.category)), ...categories].filter(Boolean)))
  }, [categories, creditor.category])

  const save = () => {
    const parsedAmount = parseMoneyInput(amount)
    const selectedCategory =
      category === NEW_CATEGORY_VALUE ? newCategory.trim() || String(creditor.category) : category
    const nextDueDay: Creditor['dueDay'] =
      dueMode === 'day'
        ? Math.min(31, Math.max(1, Number.parseInt(dueDay, 10) || 1))
        : dueMode === 'varies'
          ? 'varies'
          : dueMode === 'asap'
            ? 'asap'
            : null

    onSave({
      name: name.trim() || creditor.name,
      defaultAmount: parsedAmount ?? creditor.defaultAmount,
      dueDay: nextDueDay,
      dueDatePattern: dueToPattern(nextDueDay),
      accountLastFour: accountLastFour.replace(/\D/g, '').slice(0, 4) || undefined,
      url: url.trim() || undefined,
      website: url.trim() || undefined,
      category: selectedCategory,
      muted,
    })
  }

  const inputClass =
    'h-8 rounded-lg border border-border bg-transparent px-2 text-[13px] text-(--text-primary) outline-none transition duration-200 ease-out focus:border-(--navy)'
  const labelClass = 'space-y-1 text-[11px] font-medium uppercase tracking-[0.04em] text-(--text-tertiary)'

  return (
    <div className="space-y-3 border-t border-[--module-divider-color] px-5 pt-3 pb-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          <span>Creditor / bill name</span>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className={labelClass}>
          <span>Default amount</span>
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
          <span>Account last four</span>
          <input
            className={inputClass}
            value={accountLastFour}
            maxLength={4}
            onChange={e => setAccountLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
        <label className={labelClass}>
          <span>Website URL</span>
          <input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} />
        </label>
        <label className={labelClass}>
          <span>Category</span>
          <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
            {categoryOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>New category...</option>
          </select>
        </label>
        {category === NEW_CATEGORY_VALUE && (
          <label className={labelClass}>
            <span>New category name</span>
            <input className={inputClass} value={newCategory} onChange={e => setNewCategory(e.target.value)} />
          </label>
        )}
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-(--text-secondary)">
        <input
          type="checkbox"
          checked={muted}
          onChange={e => setMuted(e.target.checked)}
          className="size-4 accent-(--navy)"
        />
        Muted by default
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] pt-3">
        <button
          type="button"
          onClick={save}
          className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-(--navy) px-3 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--navy-dark)"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-[12px] font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
        >
          Cancel
        </button>
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
      </div>
    </div>
  )
}
