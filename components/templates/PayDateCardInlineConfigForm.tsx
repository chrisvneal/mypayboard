'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { HeaderColorSwatchPicker } from '@/components/modules/HeaderColorSwatchPicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoryDisplayName } from '@/lib/creditors'
import { generateId } from '@/lib/format'
import { resolveTemplatePayDateIso } from '@/lib/board-from-template'
import { resolveCreditorId } from '@/lib/template-utils'
import type { Bill, Creditor, Income, PayDateModule, Template, User } from '@/lib/types'
import { cn } from '@/lib/utils'

export type PayDateCardInlineConfigFormProps = {
  template: Template
  users: User[]
  incomes: Income[]
  creditors: Creditor[]
  previewMonth: number
  previewYear: number
  onSave: (module: PayDateModule) => void
  onCancel: () => void
}

export function PayDateCardInlineConfigForm({
  template,
  users,
  incomes,
  creditors,
  previewMonth,
  previewYear,
  onSave,
  onCancel,
}: PayDateCardInlineConfigFormProps) {
  const assignedUsers = useMemo(
    () => users.filter(u => template.assignedUserIds.includes(u.id)),
    [template.assignedUserIds, users]
  )
  const activeIncomes = useMemo(
    () => incomes.filter(i => i.active !== false && !i.archived),
    [incomes]
  )
  const activeExpenses = useMemo(
    () =>
      creditors.filter(
        c => c.active !== false && !c.archived && !c.muted && c.category !== 'income'
      ),
    [creditors]
  )

  const defaultOwner = assignedUsers[0]?.id ?? 'user-chris'
  const defaultIncome = activeIncomes[0]

  const [label, setLabel] = useState('')
  const [ownerId, setOwnerId] = useState(defaultOwner)
  const [incomeId, setIncomeId] = useState(defaultIncome?.id ?? '')
  const [payAmount, setPayAmount] = useState('')
  const [payDay, setPayDay] = useState('15')
  const [headerColor, setHeaderColor] = useState(
    defaultOwner === 'user-nicole' ? '#E8F7EE' : '#E6F1FB'
  )
  const [billsOpen, setBillsOpen] = useState(false)
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(() => new Set())

  const incomeName =
    activeIncomes.find(i => i.id === incomeId)?.name ?? defaultIncome?.name ?? ''

  function toggleBill(creditorId: string) {
    setSelectedBillIds(prev => {
      const next = new Set(prev)
      if (next.has(creditorId)) next.delete(creditorId)
      else next.add(creditorId)
      return next
    })
  }

  function handleSave() {
    const trimmedDay = payDay.trim() || '15'
    const payDate = resolveTemplatePayDateIso(trimmedDay, previewMonth, previewYear)
    const amount = Number.parseFloat(payAmount.replace(/[^0-9.-]/g, '')) || 0
    const dayNum = trimmedDay.toLowerCase() === 'last' ? 99 : Number.parseInt(trimmedDay, 10) || 15

    const bills: Bill[] = [...selectedBillIds].map(creditorId => {
      const creditor = creditors.find(c => c.id === creditorId || c.id === resolveCreditorId(creditorId))
      const duePattern =
        creditor?.dueDay != null ? String(creditor.dueDay) : creditor?.dueDatePattern?.replace(/^\*\//, '') ?? ''
      return {
        id: generateId('bill'),
        name: creditor?.name ?? 'Bill',
        amount: creditor?.defaultAmount ?? 0,
        dueDate: duePattern,
        category: creditor ? categoryDisplayName(String(creditor.category)) : '',
        paid: false,
        muted: false,
        notes: '',
        origin: 'master' as const,
        creditorId: creditor?.id ?? creditorId,
      }
    })

    const module: PayDateModule = {
      id: generateId('tcard'),
      templateModuleId: undefined,
      owner: ownerId,
      source: label.trim() || incomeName,
      payDate,
      payAmount: amount,
      bills,
      notes: [],
      isFromTemplate: true,
      sortOrder: 999,
      boardColumn: dayNum <= 15 ? 1 : 2,
      headerColor,
    }
    onSave(module)
  }

  const fieldClass =
    'h-9 w-full rounded-lg border border-border bg-(--bg-primary) px-3 text-[13px] outline-none focus:border-(--navy)'

  return (
    <div className="module-card w-full max-w-[min(100%,420px)] overflow-hidden shadow-(--shadow-md)">
      <div className="space-y-4 border-b border-border px-5 py-4">
        <h3 className="text-[14px] font-semibold text-(--text-primary)">Add pay date card</h3>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
            Card label / name
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={incomeName || 'e.g. Blackstone paycheck'}
            className={fieldClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
              Assigned user
            </label>
            <Select value={ownerId} onValueChange={v => setOwnerId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignedUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
              Income source
            </label>
            <Select value={incomeId} onValueChange={setIncomeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select income" />
              </SelectTrigger>
              <SelectContent>
                {activeIncomes.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
              Base pay amount
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="0.00"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-(--text-secondary)">
              Pay date (day of month)
            </label>
            <input
              type="text"
              value={payDay}
              onChange={e => setPayDay(e.target.value)}
              placeholder='e.g. "15", "30", or "last"'
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <p className="section-label mb-2">Header color</p>
          <HeaderColorSwatchPicker value={headerColor} onChange={setHeaderColor} />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setBillsOpen(o => !o)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-[13px] font-medium text-(--text-primary) hover:bg-(--bg-secondary)"
          >
            Select bills
            <ChevronDown
              className={cn('size-4 text-(--text-tertiary) transition-transform', billsOpen && 'rotate-180')}
            />
          </button>
          {billsOpen ? (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {activeExpenses.length === 0 ? (
                <li className="px-2 py-3 text-center text-[12px] text-(--text-tertiary)">
                  No active expenses on the master list.
                </li>
              ) : (
                activeExpenses.map(c => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-(--bg-secondary)">
                      <input
                        type="checkbox"
                        checked={selectedBillIds.has(c.id)}
                        onChange={() => toggleBill(c.id)}
                        className="size-4 rounded border-border"
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-(--text-primary)">
                        {c.name}
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark)"
        >
          Save Card
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) hover:bg-(--bg-tertiary)"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
