'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BoardWorkspace } from '@/components/board/BoardWorkspace'
import type { ModuleActions } from '@/components/modules/module-actions'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { generateId } from '@/lib/format'
import {
  createBlankPreviewModule,
  previewModulesToTemplate,
  templatePreviewMonthYear,
  templateToPreviewModules,
} from '@/lib/template-board-adapter'
import { refreshTemplateBillsFromMasterList } from '@/lib/template-utils'
import type { Bill, Creditor, Note, PayDateModule, Template } from '@/lib/types'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type TemplateEditorProps = {
  templateId: string
}

function updateModuleInList(
  modules: PayDateModule[],
  moduleId: string,
  changes: Partial<PayDateModule>
): PayDateModule[] {
  return modules.map(m => (m.id === moduleId ? { ...m, ...changes } : m))
}

function insertUnpaidBill(bills: Bill[], bill: Bill, beforeBillId?: string): Bill[] {
  const unpaid = bills.filter(b => !b.paid)
  const paid = bills.filter(b => b.paid)
  if (!beforeBillId) return [...unpaid, bill, ...paid]
  const idx = unpaid.findIndex(b => b.id === beforeBillId)
  const at = idx === -1 ? unpaid.length : idx
  return [...unpaid.slice(0, at), bill, ...unpaid.slice(at), ...paid]
}

export function TemplateEditor({ templateId }: TemplateEditorProps) {
  const router = useRouter()
  const {
    data,
    getTemplateById,
    updateTemplate,
    refreshTemplateFromMasterList,
    markTemplateSaved,
    isTemplateDirty,
    addCreditor,
  } = useMyPayBoard()

  const { month: previewMonth, year: previewYear } = templatePreviewMonthYear()
  const stored = getTemplateById(templateId)
  const [meta, setMeta] = useState<Template | null>(stored ?? null)
  const [modules, setModules] = useState<PayDateModule[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [sessionDirty, setSessionDirty] = useState(false)

  useEffect(() => {
    if (!stored) return
    setMeta(structuredClone(stored))
    setModules(templateToPreviewModules(stored, previewMonth, previewYear, data.incomes))
    setSessionDirty(false)
  }, [stored, previewMonth, previewYear, data.incomes])

  const dirty =
    isTemplateDirty(templateId) ||
    sessionDirty ||
    (stored && meta
      ? JSON.stringify(previewModulesToTemplate(meta, modules, previewMonth, previewYear, data.incomes)) !==
        JSON.stringify(stored)
      : false)

  const persistDraft = useCallback(
    (andClose = false) => {
      if (!meta) return
      const next = previewModulesToTemplate(meta, modules, previewMonth, previewYear, data.incomes)
      updateTemplate(templateId, next)
      markTemplateSaved(templateId)
      setMeta(next)
      setModules(templateToPreviewModules(next, previewMonth, previewYear, data.incomes))
      setSessionDirty(false)
      if (andClose) router.push(DASHBOARD_PATHS.settingsTemplates)
    },
    [
      data.incomes,
      markTemplateSaved,
      meta,
      modules,
      previewMonth,
      previewYear,
      router,
      templateId,
      updateTemplate,
    ]
  )

  function handleRefresh() {
    if (!meta) return
    const refreshed = refreshTemplateBillsFromMasterList(meta, data.creditors)
    setMeta(refreshed)
    setModules(templateToPreviewModules(refreshed, previewMonth, previewYear, data.incomes))
    refreshTemplateFromMasterList(templateId)
    setSessionDirty(true)
    setToast('Fields refreshed from master list')
    window.setTimeout(() => setToast(null), 2800)
  }

  const handleAddPayDateModule = useCallback(() => {
    if (!meta) return
    setModules(prev => [...prev, createBlankPreviewModule(meta, previewMonth, previewYear, data.incomes)])
    setSessionDirty(true)
  }, [data.incomes, meta, previewMonth, previewYear])

  const moduleActions = useMemo<ModuleActions>(
    () => ({
      onUpdate: (moduleId, changes) => {
        setModules(prev => updateModuleInList(prev, moduleId, changes))
        setSessionDirty(true)
      },
      onBillToggle: () => {},
      onBillMove: (fromModuleId, toModuleId, billId, beforeBillId) => {
        setModules(prev => {
          const from = prev.find(m => m.id === fromModuleId)
          if (!from) return prev
          const bill = from.bills.find(b => b.id === billId)
          if (!bill) return prev
          return prev.map(m => {
            if (m.id === fromModuleId) {
              return { ...m, bills: m.bills.filter(b => b.id !== billId) }
            }
            if (m.id === toModuleId) {
              return { ...m, bills: insertUnpaidBill(m.bills, bill, beforeBillId) }
            }
            return m
          })
        })
        setSessionDirty(true)
      },
      onBillAdd: (moduleId, bill) => {
        setModules(prev =>
          prev.map(m => (m.id === moduleId ? { ...m, bills: [...m.bills, bill] } : m))
        )
        setSessionDirty(true)
      },
      onCreditorAdd: (creditor: Creditor) => {
        addCreditor(creditor)
      },
      onBillUpdate: (moduleId, billId, changes) => {
        setModules(prev =>
          prev.map(m =>
            m.id === moduleId
              ? { ...m, bills: m.bills.map(b => (b.id === billId ? { ...b, ...changes } : b)) }
              : m
          )
        )
        setSessionDirty(true)
      },
      onBillRemove: (moduleId, billId) => {
        setModules(prev =>
          prev.map(m =>
            m.id === moduleId ? { ...m, bills: m.bills.filter(b => b.id !== billId) } : m
          )
        )
        setSessionDirty(true)
      },
      onNoteAdd: () => {},
      onNoteDelete: () => {},
      onNotesRead: () => {},
      onModuleRemove: moduleId => {
        setModules(prev => prev.filter(m => m.id !== moduleId))
        setSessionDirty(true)
      },
      onModuleDuplicate: source => {
        const cloneBills = source.bills.map(b => ({ ...b, id: generateId('tbill') }))
        const dup: PayDateModule = {
          ...source,
          id: generateId('tmod'),
          templateModuleId: undefined,
          bills: cloneBills,
          notes: [] as Note[],
          isFromTemplate: false,
          sortOrder: source.sortOrder + 1,
        }
        setModules(prev => [...prev, dup])
        setSessionDirty(true)
      },
      onHeaderColorSet: (module, hex) => {
        setModules(prev => updateModuleInList(prev, module.id, { headerColor: hex }))
        setSessionDirty(true)
      },
    }),
    [addCreditor]
  )

  if (!meta) {
    return (
      <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary)">
        Template not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
            Editing: {meta.name}
          </h1>
          <p className="mt-2 text-[13px] text-(--text-secondary)">
            Template blueprint — pay dates use day-of-month (preview: {previewMonth}/{previewYear})
          </p>
          {dirty ? (
            <p className="mt-1 text-[12px] font-medium text-(--warning)">Unsaved changes</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-border bg-(--bg-primary) px-3 text-[12px] font-medium text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary)"
          >
            Refresh from Master List
          </button>
          <button
            type="button"
            onClick={() => persistDraft(false)}
            className={cn(
              'relative inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark)'
            )}
          >
            Save
            {dirty ? (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-(--warning)" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => persistDraft(true)}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-(--navy) bg-(--navy-light) px-3 text-[12px] font-semibold text-(--navy) shadow-(--shadow-sm)"
          >
            Save &amp; Close
          </button>
        </div>
      </header>

      {toast ? (
        <p className="rounded-md border border-border bg-(--bg-primary) px-3 py-2 text-[13px] text-(--text-secondary) shadow-(--shadow-sm)">
          {toast}
        </p>
      ) : null}

      <BoardWorkspace
        boardId={`template-${templateId}`}
        modules={modules}
        month={previewMonth}
        year={previewYear}
        boardMode="template"
        users={data.users}
      incomeSources={data.incomes.map(income => income.name)}
        creditors={data.creditors}
        expenseCategories={data.expenseCategories}
        currentUserId={data.currentUserId}
        moduleActions={moduleActions}
        emptyMessage="No pay date modules in this template yet. Add one below."
        showAddPayDateModule
        onAddPayDateModule={handleAddPayDateModule}
      />
    </div>
  )
}
