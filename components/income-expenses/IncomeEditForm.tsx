'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Inbox, X } from 'lucide-react'
import type { CategoryDefinition, Income } from '@/lib/types'
import { useMyPayBoard } from '@/lib/MyPayBoardProvider'
import { resolveIcon, type IconKey } from '@/lib/icons'
import { IconPicker } from './IconPicker'
import {
  findCategoryByName,
  getFallbackCategory,
  resolveIncomeCategoryName,
  sortCategoriesForDropdown,
} from '@/lib/category-definitions'
import { formatCurrency } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input'
import { cn } from '@/lib/utils'
import { AmountInput } from '@/components/shared/AmountInput'
import { canSelectSharedOwner } from '@/lib/owner-options'
import { getUserDisplayName } from '@/lib/user-display-name'
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
  groupOptions: CategoryDefinition[]
  onGroupCreate: (group: string) => void
  onSave: (changes: Partial<Income>) => void
  onCancel: () => void
  onArchive?: () => void
  onToggleMute?: () => void
  muted?: boolean
  mode?: 'edit' | 'create'
}

export function IncomeEditForm({
  income,
  groupOptions,
  onGroupCreate,
  onSave,
  onCancel,
  onArchive,
  onToggleMute,
  muted = false,
  mode = 'edit',
}: IncomeEditFormProps) {
  const { data } = useMyPayBoard()
  const users = data.users
  const [icon, setIcon] = useState(income.icon ?? '')
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [typeSelectOpen, setTypeSelectOpen] = useState(false)
  const [name, setName] = useState(income.name)
  const [amount, setAmount] = useState(formatCurrency(income.amount))
  const [group, setGroup] = useState(() => displayGroup(resolveIncomeCategoryName(income, groupOptions)))
  const [frequency, setFrequency] = useState<Income['frequency']>(income.frequency)
  const [owner, setOwner] = useState<Income['owner']>(income.owner)
  const [newGroup, setNewGroup] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupError, setGroupError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const newGroupRef = useRef<HTMLInputElement>(null)
  const iconButtonRef = useRef<HTMLButtonElement>(null)
  // Keep Shared visible when editing an existing shared income in a solo
  // household so the select isn't blank; create flows never start as shared.
  const showShared = canSelectSharedOwner(users) || owner === 'shared'

  const typeOptions = useMemo(() => {
    const sorted = sortCategoriesForDropdown(groupOptions, 'income')
    const names = sorted.map(category => category.name)
    const merged = [displayGroup(resolveIncomeCategoryName(income, groupOptions)), group, ...names]
    const options: string[] = []
    merged.forEach(option => {
      const next = option.trim()
      if (!next) return
      if (!options.some(existing => existing.toLowerCase() === next.toLowerCase())) options.push(next)
    })
    return options
  }, [groupOptions, income, group])

  useEffect(() => {
    if (mode !== 'create') return
    queueMicrotask(() => nameInputRef.current?.focus())
  }, [mode])

  useEffect(() => {
    if (!creatingGroup) return
    queueMicrotask(() => newGroupRef.current?.focus())
  }, [creatingGroup])

  const startNewGroup = () => {
    setTypeSelectOpen(false)
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
    const normalized = displayGroup(next)
    if (typeOptions.some(option => option.toLowerCase() === normalized.toLowerCase())) {
      setGroupError('Type already exists')
      return
    }
    onGroupCreate(next)
    setGroup(normalized)
    setNewGroup('')
    setGroupError('')
    setCreatingGroup(false)
  }

  const hasUnsavedType = creatingGroup && newGroup.trim().length > 0

  const save = () => {
    if (hasUnsavedType) return

    const parsedAmount = parseMoneyInput(amount)
    const fallbackName = mode === 'create' ? 'New Income' : income.name
    const selectedGroup = group === NEW_GROUP_VALUE ? newGroup.trim() || income.group : group
    const matchedCategory =
      findCategoryByName(groupOptions, 'income', selectedGroup) ??
      getFallbackCategory(groupOptions, 'income')
    onSave({
      name: name.trim() || fallbackName,
      group: matchedCategory.name,
      categoryId: matchedCategory.id,
      amount: parsedAmount ?? income.amount,
      frequency,
      owner,
      icon: icon || undefined,
    })
  }

  const inputClass = cn(
    'field-control h-9 w-full border border-[--module-divider-color] px-3 text-[13px] text-(--text-primary) shadow-(--shadow-sm) outline-none placeholder:text-(--text-tertiary)',
    mode === 'create' ? 'focus:border-(--green)' : 'focus:border-(--navy)'
  )
  const labelClass = 'flex min-w-0 flex-col gap-1.5 text-[12px] font-medium tracking-normal text-(--text-secondary)'
  const { Icon: ResolvedIcon, key: resolvedIconKey } = resolveIcon(icon || undefined, group)
  const canManageExisting = mode === 'edit' && typeof onArchive === 'function'

  return (
    <div
      data-bills-income-edit-panel
      className="border-t border-[--module-divider-color] bg-[color-mix(in_srgb,var(--bg-secondary)_60%,transparent)] px-5 py-5"
    >
      <div className="max-w-3xl space-y-5">
        <div className="w-full shrink-0 sm:w-[370px]">
          <div className="flex items-start gap-2">
            {/* Icon column */}
            <div className={cn(labelClass, 'shrink-0')}>
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

            {/* Form fields */}
            <div className="min-w-0 flex-1 space-y-5">
              {/* Source name + Amount */}
              <div className="flex items-start gap-2">
                <label className={cn(labelClass, 'min-w-0 flex-1')}>
                  <span>Source name</span>
                  <input
                    ref={nameInputRef}
                    className={inputClass}
                    value={name}
                    placeholder="Name this income"
                    onChange={e => setName(e.target.value)}
                  />
                </label>
                <label className={cn(labelClass, 'w-28 shrink-0')}>
                  <span>Amount</span>
                  <AmountInput className={inputClass} value={amount} onChange={setAmount} />
                </label>
              </div>

              {/* Frequency + Type */}
              <div className="flex items-start gap-2">
                <label className={cn(labelClass, creatingGroup ? 'w-full shrink-0 sm:w-36' : 'min-w-0 flex-1')}>
                  <span>Frequency</span>
                  <select
                    className={inputClass}
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as Income['frequency'])}
                  >
                    <option value="15th-30th">15th &amp; 30th</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
                <label className={cn(labelClass, creatingGroup ? 'min-w-0 flex-1' : 'w-28 shrink-0')}>
                  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Type</span>
                    {hasUnsavedType ? (
                      <span className="text-xs font-medium text-(--green)">
                        Press Enter to save
                      </span>
                    ) : null}
                  </span>
                  {creatingGroup ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={newGroupRef}
                          className={cn(inputClass, 'min-w-0 flex-1')}
                          value={newGroup}
                          placeholder="Type name…"
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
                          onClick={cancelNewGroup}
                          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-input border border-[--module-divider-color] bg-(--bg-primary) text-(--text-tertiary) shadow-(--shadow-sm) transition duration-200 ease-out hover:bg-(--bg-secondary)"
                          aria-label="Cancel new income type"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      {groupError && <p className="mt-1 text-[11px] normal-case tracking-normal text-(--danger-muted)">{groupError}</p>}
                    </div>
                  ) : (
                    <Select
                      open={typeSelectOpen}
                      onOpenChange={setTypeSelectOpen}
                      value={SELECT_DISPLAY_ONLY_VALUE}
                      onValueChange={setGroup}
                    >
                      <SelectTrigger className={inputClass}>
                        <SelectValue>{group}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(option => (
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
                              startNewGroup()
                            }}
                            className="relative flex w-full cursor-pointer select-none items-center rounded-input py-3 pl-2 pr-2 text-[13px] text-(--text-primary) outline-none hover:bg-(--bg-tertiary) focus:bg-(--bg-tertiary)"
                          >
                            + New type
                          </button>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </label>
              </div>

              {/* Person */}
              <div className="flex items-start gap-2">
                <label className={cn(labelClass, 'w-full shrink-0 sm:w-36')}>
                  <span>Person</span>
                  <select
                    className={inputClass}
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>
                    ))}
                    {showShared ? <option value="shared">Shared</option> : null}
                  </select>
                </label>
                <div className="w-28 shrink-0" aria-hidden />
              </div>
            </div>
          </div>
        </div>

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
              {muted ? 'Unmute source' : 'Mute source'}
            </button>
            <button
              type="button"
              onClick={onArchive}
              className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-(--text-secondary) transition duration-200 ease-out hover:text-(--navy)"
            >
              <Inbox className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              Archive source
            </button>
          </div>
        )}
        <div className={cn('flex items-center gap-3', mode === 'edit' && 'ml-auto')}>
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
            disabled={hasUnsavedType}
            className={cn(
              'btn-green inline-flex h-8 cursor-pointer items-center px-3 text-[13px] font-medium shadow-(--shadow-sm)',
              hasUnsavedType && 'cursor-not-allowed opacity-40'
            )}
          >
            {mode === 'create' ? 'Save Income' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
