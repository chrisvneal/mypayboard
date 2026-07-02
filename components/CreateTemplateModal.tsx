'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppModal } from '@/components/AppModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { subscribeRouteTransitionOverlayClear } from '@/lib/route-transition-overlay'
import { sortTemplatesForDisplay } from '@/lib/template-utils'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

const DROPDOWN_HIDE_MS = 200

export type CreateTemplateModalProps = {
  open: boolean
  onClose: () => void
}

export function CreateTemplateModal({ open, onClose }: CreateTemplateModalProps) {
  const router = useRouter()
  const { templates, createTemplate } = useMyPayBoard()
  const sortedTemplates = useMemo(() => sortTemplatesForDisplay(templates), [templates])
  const defaultTemplate = sortedTemplates.find(t => t.isDefault) ?? sortedTemplates[0]
  const defaultTemplateId = defaultTemplate?.id ?? ''
  const [name, setName] = useState('')
  const [useExisting, setUseExisting] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [editNavigating, setEditNavigating] = useState(false)
  const [routeOverlay, setRouteOverlay] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const sourceClearTimerRef = useRef<number | null>(null)

  const canCopy = sortedTemplates.length > 0
  const selectedSourceId = sourceId || defaultTemplateId

  useEffect(() => {
    if (!open || !defaultTemplateId) return
    router.prefetch(`${DASHBOARD_PATHS.settingsTemplates}/${defaultTemplateId}/edit`)
  }, [defaultTemplateId, open, router])

  useEffect(() => {
    return subscribeRouteTransitionOverlayClear(() => {
      setRouteOverlay(false)
      setEditNavigating(false)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (sourceClearTimerRef.current) window.clearTimeout(sourceClearTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open])

  function handleClose() {
    if (sourceClearTimerRef.current) {
      window.clearTimeout(sourceClearTimerRef.current)
      sourceClearTimerRef.current = null
    }
    setName('')
    setUseExisting(false)
    setSourceId('')
    setEditNavigating(false)
    onClose()
  }

  const canSubmit = name.trim().length > 0

  function handleCreate(redirectToEdit: boolean) {
    if (!canSubmit) return
    const created = createTemplate(
      name.trim(),
      useExisting ? selectedSourceId : undefined
    )
    if (redirectToEdit) {
      const href = `${DASHBOARD_PATHS.settingsTemplates}/${created.id}/edit`
      setEditNavigating(true)
      setRouteOverlay(true)
      setName('')
      setUseExisting(false)
      setSourceId('')
      onClose()
      router.prefetch(href)
      router.push(href)
      return
    }
    handleClose()
  }

  return (
    <>
    <AppModal
      open={open}
      align="center-stable"
      className="max-w-sm"
      onClose={handleClose}
      title="Create New Template"
      footer={
        <>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => handleCreate(false)}
            className="inline-flex h-9 cursor-pointer items-center rounded-input border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) shadow-(--shadow-sm) transition hover:bg-(--bg-tertiary) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={!canSubmit || editNavigating}
            onClick={() => handleCreate(true)}
            className="inline-flex h-9 min-w-[4.5rem] cursor-pointer items-center justify-center gap-1.5 rounded-input bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) transition hover:bg-(--navy-dark) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editNavigating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                <span className="sr-only">Opening editor…</span>
              </>
            ) : (
              'Edit'
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-(--text-secondary)">
            Template Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Standard Month"
            className="field-control h-9 w-full border border-border px-3 text-[13px] outline-none focus:border-(--navy)"
          />
        </div>

        {canCopy ? (
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={useExisting}
                onChange={e => {
                  const checked = e.target.checked
                  setUseExisting(checked)
                  if (checked) {
                    if (sourceClearTimerRef.current) {
                      window.clearTimeout(sourceClearTimerRef.current)
                      sourceClearTimerRef.current = null
                    }
                    setSourceId(prev => prev || defaultTemplateId)
                    return
                  }
                  if (sourceClearTimerRef.current) {
                    window.clearTimeout(sourceClearTimerRef.current)
                  }
                  sourceClearTimerRef.current = window.setTimeout(() => {
                    setSourceId('')
                    sourceClearTimerRef.current = null
                  }, DROPDOWN_HIDE_MS)
                }}
                className="mt-0.5 size-4 rounded border-border accent-(--navy)"
              />
              <span className="text-[13px] text-(--text-primary)">Create from existing template</span>
            </label>

            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out',
                useExisting ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-0.5">
                  <Select value={selectedSourceId} onValueChange={setSourceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.isDefault ? ' (default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppModal>
      {routeOverlay && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] bg-background opacity-100 transition-opacity duration-150 ease-out"
              aria-hidden
            />,
            document.body
          )
        : null}
    </>
  )
}
