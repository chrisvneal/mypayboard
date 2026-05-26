'use client'

import { useEffect, useRef, useState } from 'react'
import type { Income } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { parseMoneyInput } from '@/lib/money-input'

type IncomeEditFormProps = {
  income: Income
  onSave: (changes: Partial<Income>) => void
  onCancel: () => void
  onArchive?: () => void
  onDelete?: () => void
  mode?: 'edit' | 'create'
}

export function IncomeEditForm({
  income,
  onSave,
  onCancel,
  onArchive,
  onDelete,
  mode = 'edit',
}: IncomeEditFormProps) {
  const [name, setName] = useState(income.name)
  const [amount, setAmount] = useState(formatCurrency(income.amount))
  const [frequency, setFrequency] = useState<Income['frequency']>(income.frequency)
  const [owner, setOwner] = useState<Income['owner']>(income.owner)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode !== 'create') return
    queueMicrotask(() => nameInputRef.current?.focus())
  }, [mode])

  const save = () => {
    const parsedAmount = parseMoneyInput(amount)
    const fallbackName = mode === 'create' ? 'New Income' : income.name
    onSave({
      name: name.trim() || fallbackName,
      amount: parsedAmount ?? income.amount,
      frequency,
      owner,
    })
  }

  const inputClass =
    'h-9 w-full rounded-lg border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none transition duration-200 ease-out placeholder:text-(--text-tertiary) focus:border-(--green)'
  const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wider text-(--text-tertiary)'
  const canManageExisting = mode === 'edit' && typeof onArchive === 'function' && typeof onDelete === 'function'

  return (
    <div className="space-y-5 border-t border-[--module-divider-color] bg-[color-mix(in_srgb,var(--bg-secondary)_42%,transparent)] px-5 py-5">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        <label className={labelClass}>
          <span>Source name</span>
          <input
            ref={nameInputRef}
            className={inputClass}
            value={name}
            placeholder="Name this income"
            onChange={e => setName(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          <span>Amount</span>
          <input className={inputClass} value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label className={labelClass}>
          <span>Frequency</span>
          <select
            className={inputClass}
            value={frequency}
            onChange={e => setFrequency(e.target.value as Income['frequency'])}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="15th-30th">15th &amp; 30th</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className={labelClass}>
          <span>Person</span>
          <select
            className={inputClass}
            value={owner}
            onChange={e => setOwner(e.target.value as Income['owner'])}
          >
            <option value="chris">Chris</option>
            <option value="nicole">Nicole</option>
            <option value="shared">Shared</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] pt-4">
        <button
          type="button"
          onClick={save}
          className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-(--green) px-3 text-[13px] font-medium text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--green-dark)"
        >
          {mode === 'create' ? 'Save Income' : 'Save'}
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
