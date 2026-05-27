'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Income } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'

const NEW_GROUP_VALUE = '__new__'

function displayGroup(group: string): string {
  const normalized = group.toLowerCase()
  if (normalized === 'jobs' || normalized === 'job') return 'Jobs'
  if (normalized === 'benefits' || normalized === 'benefit') return 'Benefits'
  if (normalized === 'business') return 'Business'
  if (normalized === 'other') return 'Other'
  return group
}

type IncomeEditFormProps = {
  income: Income
  groupOptions: string[]
  onGroupCreate: (group: string) => void
  onSave: (changes: Partial<Income>) => void
  onCancel: () => void
  onArchive?: () => void
  onDelete?: () => void
  mode?: 'edit' | 'create'
}

export function IncomeEditForm({
  income,
  groupOptions,
  onGroupCreate,
  onSave,
  onCancel,
  onArchive,
  onDelete,
  mode = 'edit',
}: IncomeEditFormProps) {
  const [name, setName] = useState(income.name)
  const [amount, setAmount] = useState(formatCurrency(income.amount))
  const [group, setGroup] = useState(displayGroup(income.group))
  const [frequency, setFrequency] = useState<Income['frequency']>(income.frequency)
  const [owner, setOwner] = useState<Income['owner']>(income.owner)
  const [newGroup, setNewGroup] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupError, setGroupError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const newGroupRef = useRef<HTMLInputElement>(null)

  const typeOptions = useMemo(() => {
    const options: string[] = []
    const availableOptions = [displayGroup(income.group), group, ...groupOptions]
    availableOptions.forEach(option => {
      const next = option.trim()
      if (!next) return
      if (!options.some(existing => existing.toLowerCase() === next.toLowerCase())) options.push(next)
    })
    return options
  }, [groupOptions, income.group, group])

  useEffect(() => {
    if (mode !== 'create') return
    queueMicrotask(() => nameInputRef.current?.focus())
  }, [mode])

  useEffect(() => {
    if (!creatingGroup) return
    queueMicrotask(() => newGroupRef.current?.focus())
  }, [creatingGroup])

  const startNewGroup = () => {
    setNewGroup('')
    setGroupError('')
    setCreatingGroup(true)
  }

  const cancelNewGroup = () => {
    setNewGroup('')
    setGroupError('')
    setCreatingGroup(false)
  }

  const confirmNewGroup = () => {
    const next = newGroup.trim()
    if (!next) return
    if (typeOptions.some(option => option.toLowerCase() === next.toLowerCase())) {
      setGroupError('Type already exists')
      return
    }
    onGroupCreate(next)
    setGroup(next)
    setGroupError('')
    setCreatingGroup(false)
  }

  const save = () => {
    const parsedAmount = parseMoneyInput(amount)
    const fallbackName = mode === 'create' ? 'New Income' : income.name
    const selectedGroup = group === NEW_GROUP_VALUE ? newGroup.trim() || income.group : group
    onSave({
      name: name.trim() || fallbackName,
      group: selectedGroup,
      amount: parsedAmount ?? income.amount,
      frequency,
      owner,
    })
  }

  const inputClass =
    'h-9 w-full rounded-lg border border-[--module-divider-color] bg-(--bg-primary) px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none transition duration-200 ease-out placeholder:text-(--text-tertiary) focus:border-(--green)'
  const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[11px] font-medium uppercase tracking-wider text-(--text-tertiary)'
  const formContentClass = 'mx-auto max-w-[620px]'
  const formGridClass =
    `${formContentClass} grid gap-x-10 gap-y-4 sm:grid-cols-[minmax(0,280px)_minmax(0,280px)]`
  const canManageExisting = mode === 'edit' && typeof onArchive === 'function' && typeof onDelete === 'function'

  return (
    <div className="space-y-5 border-t border-[--module-divider-color] bg-[color-mix(in_srgb,var(--bg-secondary)_42%,transparent)] px-5 py-5">
      <div className={formGridClass}>
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
          <span>Type</span>
          {creatingGroup ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  ref={newGroupRef}
                  className={inputClass}
                  value={newGroup}
                  placeholder="Type name..."
                  onChange={e => {
                    setNewGroup(e.target.value)
                    setGroupError('')
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmNewGroup()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelNewGroup()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={confirmNewGroup}
                  disabled={!newGroup.trim()}
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) text-(--text-secondary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary) disabled:cursor-default disabled:opacity-40"
                  aria-label="Add income type"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelNewGroup}
                  className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[--module-divider-color] bg-(--bg-primary) text-(--text-tertiary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary)"
                  aria-label="Cancel new income type"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {groupError && <p className="mt-1 text-[11px] normal-case tracking-normal text-(--danger-muted)">{groupError}</p>}
            </div>
          ) : (
            <select
              className={inputClass}
              value={group}
              onChange={e => {
                if (e.target.value === NEW_GROUP_VALUE) {
                  startNewGroup()
                  return
                }
                setGroup(e.target.value)
              }}
            >
              {typeOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <optgroup label="Custom">
                <option value={NEW_GROUP_VALUE}>+ New type</option>
              </optgroup>
            </select>
          )}
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

      <div className={`${formContentClass} flex flex-wrap items-center gap-3 border-t border-[--module-divider-color] pt-4`}>
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
