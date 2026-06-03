'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, Settings } from 'lucide-react'
import { BoardWorkspace } from '@/components/board/BoardWorkspace'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import { PayDateCardInlineConfigForm } from '@/components/templates/PayDateCardInlineConfigForm'
import type { ModuleActions } from '@/components/modules/module-actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { generateId } from '@/lib/format'
import { payDateSortTime } from '@/lib/pay-date'
import {
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

function sortPreviewModules(modules: PayDateModule[]): PayDateModule[] {
  const fallback = Date.now()
  return [...modules]
    .sort((a, z) => payDateSortTime(a.payDate, fallback) - payDateSortTime(z.payDate, fallback))
    .map((m, index) => {
      const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(m.payDate.trim())
      const dayOfMonth = iso ? Number(iso[3]) : 15
      return {
        ...m,
        sortOrder: index + 1,
        boardColumn: dayOfMonth <= 15 ? 1 : 2,
      }
    })
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
    setDefaultTemplate,
    deleteTemplate,
    updateTemplate,
    refreshTemplateFromMasterList,
    markTemplateSaved,
    isTemplateDirty,
    addCreditor,
    updateCreditor,
  } = useMyPayBoard()

  const { month: previewMonth, year: previewYear } = templatePreviewMonthYear()
  const stored = getTemplateById(templateId)
  const [meta, setMeta] = useState<Template | null>(stored ?? null)
  const [modules, setModules] = useState<PayDateModule[]>([])
  const [refreshNotedAt, setRefreshNotedAt] = useState<number | null>(null)
  const [sessionDirty, setSessionDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<'delete' | null>(null)
  const [addingPayDateCard, setAddingPayDateCard] = useState(false)
  const skipNextStoredSyncRef = useRef(false)

  useEffect(() => {
    if (!stored) return
    if (skipNextStoredSyncRef.current) {
      skipNextStoredSyncRef.current = false
      return
    }
    setMeta(structuredClone(stored))
    setModules(templateToPreviewModules(stored, previewMonth, previewYear, data.incomes))
    setSessionDirty(false)
    setRefreshNotedAt(null)
  }, [stored, previewMonth, previewYear, data.incomes])

  const dirty = isTemplateDirty(templateId) || sessionDirty

  const persistDraft = useCallback(
    (andClose = false) => {
      if (!meta) return
      const next = previewModulesToTemplate(meta, modules, previewMonth, previewYear, data.incomes)
      skipNextStoredSyncRef.current = true
      updateTemplate(templateId, next)
      if (next.isDefault) {
        setDefaultTemplate(templateId)
      }
      markTemplateSaved(templateId)
      setMeta(next)
      setSessionDirty(false)
      setRefreshNotedAt(null)
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
      setDefaultTemplate,
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
    setRefreshNotedAt(Date.now())
  }

  const moduleActions = useMemo<ModuleActions>(
    () => ({
      onUpdate: (moduleId, changes) => {
        setModules(prev => {
          const next = updateModuleInList(prev, moduleId, changes)
          return 'payDate' in changes ? sortPreviewModules(next) : next
        })
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
          id: generateId('tcard'),
          templateModuleId: undefined,
          bills: cloneBills,
          notes: [] as Note[],
          isFromTemplate: false,
          sortOrder: source.sortOrder + 1,
        }
        setModules(prev => sortPreviewModules([...prev, dup]))
        setSessionDirty(true)
      },
      onHeaderColorSet: (module, hex) => {
        setModules(prev => updateModuleInList(prev, module.id, { headerColor: hex }))
        setSessionDirty(true)
      },
      onRestoreCreditorInMasterList: creditorId => {
        updateCreditor(creditorId, {
          archived: false,
          archivedAt: undefined,
          active: true,
        })
      },
    }),
    [addCreditor, updateCreditor]
  )

  if (!meta) {
    return (
      <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary)">
        Template not found.
      </div>
    )
  }

  const statusText = dirty
    ? 'Unsaved changes'
    : refreshNotedAt
      ? 'Refreshed from master list'
      : 'All changes saved'

  const statusClass = dirty
    ? 'text-(--warning)'
    : refreshNotedAt
      ? 'text-(--info)'
      : 'text-(--green)'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="truncate text-2xl font-semibold tracking-tight text-(--text-primary)"
            title={meta.name}
          >
            Editing Template: {meta.name}
          </h1>
          <p className="mt-2 text-[13px] text-(--text-secondary)">
            Template blueprint — pay dates use day-of-month (preview: {previewMonth}/{previewYear})
          </p>
          <div className="mt-3.5 min-h-[18px]">
            <p
              className={cn(
                'inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-150',
                statusClass
              )}
            >
              {!dirty && !refreshNotedAt ? (
                <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              ) : null}
              {statusText}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu
            onOpenChange={open => {
              if (!open) setPendingAction(null)
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-(--bg-primary) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
                aria-label="Template settings"
              >
                <Settings className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={event => {
                  event.preventDefault()
                  handleRefresh()
                }}
              >
                Refresh from Master List
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={event => {
                  event.preventDefault()
                  setMeta(prev => (prev ? { ...prev, isDefault: !prev.isDefault } : prev))
                  setSessionDirty(true)
                }}
              >
                {meta.isDefault ? 'Unset as default' : 'Set as default'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-(--danger)"
                onSelect={event => {
                  event.preventDefault()
                  if (pendingAction !== 'delete') {
                    setPendingAction('delete')
                    return
                  }
                  deleteTemplate(templateId)
                  router.push(DASHBOARD_PATHS.settingsTemplates)
                }}
              >
                {pendingAction === 'delete' ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    Confirm delete
                  </span>
                ) : (
                  'Delete template'
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => persistDraft(false)}
            className={cn(
              'relative inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-3 text-[12px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark)'
            )}
          >
            Save Template
            {dirty ? (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-(--warning)" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => persistDraft(true)}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-(--navy) bg-(--navy-light) px-3 text-[12px] font-semibold text-(--navy) shadow-(--shadow-sm)"
          >
            Save Template &amp; Close
          </button>
        </div>
      </header>

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
        boardMaxWidthClass="max-w-[1560px]"
        payDateCardAddSlot={
          addingPayDateCard ? (
            <PayDateCardInlineConfigForm
              template={meta}
              users={data.users}
              incomes={data.incomes}
              creditors={data.creditors}
              previewMonth={previewMonth}
              previewYear={previewYear}
              onSave={newModule => {
                setModules(prev => sortPreviewModules([...prev, newModule]))
                setSessionDirty(true)
                setAddingPayDateCard(false)
              }}
              onCancel={() => setAddingPayDateCard(false)}
            />
          ) : (
            <PlaceholderCard
              label="Add pay date card"
              onClick={() => setAddingPayDateCard(true)}
            />
          )
        }
      />
    </div>
  )
}
