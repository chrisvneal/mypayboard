'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppModal } from '@/components/AppModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

export type CreateTemplateModalProps = {
  open: boolean
  onClose: () => void
}

type StartingPoint = 'scratch' | 'copy'

export function CreateTemplateModal({ open, onClose }: CreateTemplateModalProps) {
  const router = useRouter()
  const { templates, createTemplate } = useMyPayBoard()
  const [name, setName] = useState('')
  const [startingPoint, setStartingPoint] = useState<StartingPoint>('scratch')
  const [sourceId, setSourceId] = useState<string>('')
  const [openStateReady, setOpenStateReady] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!open) {
      setOpenStateReady(false)
      return
    }
    setName('')
    setStartingPoint('scratch')
    setSourceId(templates[0]?.id ?? '')
    setOpenStateReady(true)
  }, [open, templates])

  useEffect(() => {
    if (!open || !openStateReady) return
    const id = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, openStateReady])

  const canCopy = templates.length > 0
  const effectiveStartingPoint: StartingPoint = openStateReady ? startingPoint : 'scratch'
  const canSubmit = name.trim().length > 0

  function handleCreate() {
    if (!canSubmit) return
    const created = createTemplate(
      name.trim(),
      effectiveStartingPoint === 'copy' && sourceId ? sourceId : undefined
    )
    onClose()
    router.push(`${DASHBOARD_PATHS.settingsTemplates}/${created.id}/edit`)
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Create New Template"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary)"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleCreate}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) transition hover:bg-(--navy-dark) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Template
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
            Template Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Standard Month"
            className="h-9 w-full rounded-lg border border-border bg-(--bg-primary) px-3 text-[13px] outline-none focus:border-(--navy)"
          />
        </div>

        <div>
          <span className="mb-2 block text-[12px] font-medium text-(--text-secondary)">
            Starting Point
          </span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(
              [
                { id: 'scratch' as const, label: 'Start from scratch' },
                { id: 'copy' as const, label: 'Copy existing template' },
              ] as const
            ).map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStartingPoint(option.id)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-medium transition',
                  effectiveStartingPoint === option.id
                    ? 'bg-(--navy) text-white shadow-(--shadow-sm)'
                    : 'text-(--text-secondary) hover:bg-(--bg-tertiary)'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {effectiveStartingPoint === 'copy' ? (
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-(--text-secondary)">
              Copy from
            </label>
            <Select
              value={sourceId}
              onValueChange={setSourceId}
              disabled={!canCopy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canCopy ? (
              <p className="mt-1.5 text-[12px] text-(--text-tertiary)">
                No existing templates to copy
              </p>
            ) : null}
          </div>
        ) : null}

      </div>
    </AppModal>
  )
}
