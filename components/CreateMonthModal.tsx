'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppModal } from '@/components/AppModal'
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
  onCreated?: () => void
}

const BLANK_BOARD_ID = '__blank__'

export function CreateMonthModal({ open, onClose, onCreated }: CreateMonthModalProps) {
  const router = useRouter()
  const { templates, createBoardFromTemplate, createBlankBoard } = useMyPayBoard()
  const monthOptions = useMemo(() => monthYearOptions(7), [])
  // Only an explicitly-marked default template counts — otherwise fall back to Blank Board,
  // never an arbitrary template.
  const defaultTemplate = templates.find(t => t.isDefault)
  const defaultMonth = monthOptions[0]
  const defaultMonthKey = defaultMonth ? `${defaultMonth.year}-${defaultMonth.month}` : ''
  const defaultTemplateId = defaultTemplate?.id ?? BLANK_BOARD_ID

  const [monthKey, setMonthKey] = useState(defaultMonthKey)
  const [templateId, setTemplateId] = useState(defaultTemplateId)

  // Modal instances stay mounted across open/close, and `templates` can still be
  // loading from localStorage the first time this mounts — re-sync the defaults
  // on every open (not just at mount) so a late-loaded default template (or one
  // marked default after mount) is reflected instead of a stale initial value.
  // Adjusted during render (React's recommended pattern for prop-driven resets)
  // rather than in an effect, to avoid an extra render pass.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMonthKey(defaultMonthKey)
      setTemplateId(defaultTemplateId)
    }
  }

  const selectedMonthKey = monthKey || defaultMonthKey
  const selectedTemplateId = templateId || defaultTemplateId
  const selectedMonth = monthOptions.find(o => `${o.year}-${o.month}` === selectedMonthKey) ?? defaultMonth

  function closeModal() {
    setMonthKey('')
    setTemplateId('')
    onClose()
  }

  function handleCreateBoard() {
    if (!selectedMonth) return
    if (selectedTemplateId === BLANK_BOARD_ID) {
      createBlankBoard(selectedMonth.month, selectedMonth.year)
    } else {
      const board = createBoardFromTemplate(selectedTemplateId, selectedMonth.month, selectedMonth.year)
      if (!board) return
    }
    closeModal()
    onCreated?.()
    router.push(DASHBOARD_PATHS.home)
  }

  const isBlank = selectedTemplateId === BLANK_BOARD_ID

  return (
    <AppModal
      open={open}
      onClose={closeModal}
      title="Create New Month Board"
      description="Choose a month and starting point for your new board."
      className="max-w-sm"
      footer={
        <>
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-9 cursor-pointer items-center rounded-input border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary)"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateBoard}
            disabled={!selectedMonth}
            className="inline-flex h-9 cursor-pointer items-center rounded-input bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Board
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-(--text-secondary)">
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
          <label className="mb-1.5 block text-[13px] font-medium text-(--text-secondary)">
            Starting Point
          </label>
          <Select value={selectedTemplateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault ? ' (Default)' : ''}
                </SelectItem>
              ))}
              <SelectItem value={BLANK_BOARD_ID}>Blank Board</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[12px] text-(--text-tertiary)">
            {isBlank
              ? 'Starts with an empty board — add pay date cards manually.'
              : 'This template includes your pay dates, income sources, and creditors.'}
          </p>
        </div>
      </div>
    </AppModal>
  )
}
