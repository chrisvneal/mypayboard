'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutTemplate } from 'lucide-react'
import { AppModal } from '@/components/AppModal'
import { CreateTemplateModal } from '@/components/CreateTemplateModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { monthYearOptions } from '@/lib/board-from-template'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export type CreateMonthModalProps = {
  open: boolean
  onClose: () => void
}

export function CreateMonthModal({ open, onClose }: CreateMonthModalProps) {
  const router = useRouter()
  const { templates, createBoardFromTemplate } = useMyPayBoard()
  const monthOptions = useMemo(() => monthYearOptions(7), [])
  const defaultTemplate = templates.find(t => t.isDefault) ?? templates[0]
  const defaultMonth = monthOptions[0]
  const defaultMonthKey = defaultMonth ? `${defaultMonth.year}-${defaultMonth.month}` : ''
  const defaultTemplateId = defaultTemplate?.id ?? ''

  const [monthKey, setMonthKey] = useState(defaultMonthKey)
  const [templateId, setTemplateId] = useState(defaultTemplateId)
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)

  const selectedMonthKey = monthKey || defaultMonthKey
  const selectedTemplateId = templateId || defaultTemplateId
  const selectedMonth = monthOptions.find(o => `${o.year}-${o.month}` === selectedMonthKey) ?? defaultMonth

  function closeModal() {
    setMonthKey('')
    setTemplateId('')
    onClose()
  }

  function handleCreateBoard() {
    if (!selectedMonth || !selectedTemplateId) return
    const board = createBoardFromTemplate(selectedTemplateId, selectedMonth.month, selectedMonth.year)
    if (!board) return
    closeModal()
    router.push(DASHBOARD_PATHS.home)
  }

  if (templates.length === 0) {
    return (
      <>
        <AppModal
          open={open}
          onClose={closeModal}
          title="Create New Month Board"
          className="max-w-sm"
        >
          <div className="flex flex-col items-center py-4 text-center">
            <LayoutTemplate className="mb-3 size-8 text-(--text-tertiary)" />
            <p className="font-medium text-(--text-primary)">No templates yet</p>
            <p className="mt-1.5 max-w-xs text-[13px] text-(--text-tertiary)">
              You need a template before creating a board.
            </p>
            <button
              type="button"
              onClick={() => {
                closeModal()
                setCreateTemplateOpen(true)
              }}
              className="mt-5 inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark)"
            >
              Create Your First Template
            </button>
          </div>
        </AppModal>
        <CreateTemplateModal
          open={createTemplateOpen}
          onClose={() => setCreateTemplateOpen(false)}
        />
      </>
    )
  }

  return (
    <AppModal
      open={open}
      onClose={closeModal}
      title="Create New Month Board"
      description="Choose a month and template for your new board."
      className="max-w-sm"
      footer={
        <>
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary)"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateBoard}
            disabled={!selectedMonth || !selectedTemplateId}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Board
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
            Select Month
          </label>
          <Select value={selectedMonthKey} onValueChange={setMonthKey}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMonth ? (
            <p className="mt-1.5 text-[12px] text-(--text-tertiary)">
              Creates a board for {selectedMonth.label}.
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
            Template
          </label>
          <Select value={selectedTemplateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault ? ' (Default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[12px] text-(--text-tertiary)">
            This template includes your pay dates, income sources, and creditors.
          </p>
        </div>
      </div>
    </AppModal>
  )
}
