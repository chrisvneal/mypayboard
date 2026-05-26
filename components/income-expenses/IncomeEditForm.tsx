'use client'

import { useState } from 'react'
import type { Income } from '@/lib/types'
import { formatCurrency } from '@/lib/useMyPayBoard'
import { parseMoneyInput } from '@/lib/money-input'

type IncomeEditFormProps = {
  income: Income
  onSave: (changes: Partial<Income>) => void
  onCancel: () => void
  onArchive: () => void
  onDelete: () => void
}

export function IncomeEditForm({
  income,
  onSave,
  onCancel,
  onArchive,
  onDelete,
}: IncomeEditFormProps) {
  const [name, setName] = useState(income.name)
  const [amount, setAmount] = useState(formatCurrency(income.amount))
  const [frequency, setFrequency] = useState<Income['frequency']>(income.frequency)
  const [owner, setOwner] = useState<Income['owner']>(income.owner)
  const [notes, setNotes] = useState(income.notes ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const save = () => {
    const parsedAmount = parseMoneyInput(amount)
    onSave({
      name: name.trim() || income.name,
      amount: parsedAmount ?? income.amount,
      frequency,
      owner,
      notes: notes.trim(),
    })
  }

  const inputClass =
    'h-9 rounded-md border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) outline-none transition duration-200 ease-out focus:border-(--green)'
  const labelClass = 'space-y-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-(--text-tertiary)'

  return (
    <div className="space-y-4 px-4 pb-4 pt-1">
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClass}>
          <span>Source name</span>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} />
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
          <span>Owner</span>
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
        <label className={`${labelClass} md:col-span-2`}>
          <span>Notes</span>
          <input className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] pt-3">
        <button
          type="button"
          onClick={save}
          className="inline-flex h-8 cursor-pointer items-center rounded-md bg-(--green) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--green-dark)"
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
