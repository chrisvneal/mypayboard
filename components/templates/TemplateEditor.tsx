'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle2, Pencil, Settings } from 'lucide-react'
import { AppModal } from '@/components/AppModal'
import { BoardWorkspace } from '@/components/board/BoardWorkspace'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import { PayDateCardInlineForm } from '@/components/PayDateCardInlineForm'
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
  previewPayDateCardsToTemplate,
  templatePreviewMonthYear,
  templateToPreviewPayDateCards,
} from '@/lib/template-board-adapter'
import {
  cancelPendingLeave,
  confirmPendingLeave,
  setNavigationBlocker,
} from '@/lib/navigation-guard'
import { refreshTemplateBillsFromMasterList, promoteNextDefaultTemplateId } from '@/lib/template-utils'
import { scrollPayDateCardFormHostOnNextFrame } from '@/lib/pay-date-card-form-scroll'
import type { Bill, BoardColumn, Creditor, Note, PayDateCard, Template } from '@/lib/types'
import { clearRouteTransitionOverlay } from '@/lib/route-transition-overlay'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type TemplateEditorProps = {
  templateId: string
}

function updatePayDateCardInList(
  payDateCards: PayDateCard[],
  cardId: string,
  changes: Partial<PayDateCard>
): PayDateCard[] {
  return payDateCards.map(m => (m.id === cardId ? { ...m, ...changes } : m))
}

function sortPreviewPayDateCards(payDateCards: PayDateCard[]): PayDateCard[] {
  const fallback = Date.now()
  return [...payDateCards]
    .sort((a, z) => {
      const ca = (a.boardColumn ?? 1) as BoardColumn
      const cz = (z.boardColumn ?? 1) as BoardColumn
      if (ca !== cz) return ca - cz
      return payDateSortTime(a.payDate, fallback) - payDateSortTime(z.payDate, fallback)
    })
    .map((m, index) => ({
      ...m,
      sortOrder: index + 1,
    }))
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
    addExpenseCategory,
    updateCreditor,
    templates,
  } = useMyPayBoard()

  const { month: previewMonth, year: previewYear } = templatePreviewMonthYear()
  const stored = getTemplateById(templateId)
  const [meta, setMeta] = useState<Template | null>(stored ?? null)
  const [payDateCards, setPayDateCards] = useState<PayDateCard[]>([])
  const [refreshNotedAt, setRefreshNotedAt] = useState<number | null>(null)
  const [sessionDirty, setSessionDirty] = useState(false)
  const [savedThisSession, setSavedThisSession] = useState(false)
  const [pendingAction, setPendingAction] = useState<'delete' | null>(null)
  const [addingPayDateCard, setAddingPayDateCard] = useState(false)
  const [addFormSession, setAddFormSession] = useState(0)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const skipNextStoredSyncRef = useRef(false)
  const inlineFormRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const ignoreBlurRef = useRef(false)
  const focusNameAfterMenuCloseRef = useRef(false)

  useEffect(() => {
    clearRouteTransitionOverlay()
  }, [])

  useEffect(() => {
    if (!stored) return
    if (skipNextStoredSyncRef.current) {
      skipNextStoredSyncRef.current = false
      return
    }
    setMeta(structuredClone(stored))
    setPayDateCards(templateToPreviewPayDateCards(stored, previewMonth, previewYear, data.incomes))
    setSessionDirty(false)
    setSavedThisSession(false)
    setRefreshNotedAt(null)
    setEditingName(false)
  }, [stored, previewMonth, previewYear, data.incomes])

  useEffect(() => {
    if (!editingName) return
    const blurGuard = window.setTimeout(() => {
      ignoreBlurRef.current = false
    }, 200)

    if (!focusNameAfterMenuCloseRef.current) {
      const focusTimer = window.setTimeout(() => {
        nameInputRef.current?.focus()
        nameInputRef.current?.select()
      }, 0)
      return () => {
        window.clearTimeout(blurGuard)
        window.clearTimeout(focusTimer)
      }
    }

    return () => window.clearTimeout(blurGuard)
  }, [editingName])

  const dirty = isTemplateDirty(templateId) || sessionDirty

  useEffect(() => {
    if (!dirty) {
      setNavigationBlocker(null)
      return
    }
    setNavigationBlocker(() => {
      setLeaveDialogOpen(true)
    })
    return () => setNavigationBlocker(null)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!addingPayDateCard) return
    scrollPayDateCardFormHostOnNextFrame(() => inlineFormRef.current)
  }, [addingPayDateCard])

  const persistDraft = useCallback(
    (andClose = false) => {
      if (!meta) return
      const next = previewPayDateCardsToTemplate(meta, payDateCards, previewMonth, previewYear, data.incomes)
      skipNextStoredSyncRef.current = true
      updateTemplate(templateId, next)
      if (next.isDefault) {
        setDefaultTemplate(templateId)
      }
      markTemplateSaved(templateId)
      setMeta(next)
      setSessionDirty(false)
      setSavedThisSession(true)
      setRefreshNotedAt(null)
      if (andClose) router.push(DASHBOARD_PATHS.settingsTemplates)
    },
    [
      data.incomes,
      markTemplateSaved,
      meta,
      payDateCards,
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
    setPayDateCards(templateToPreviewPayDateCards(refreshed, previewMonth, previewYear, data.incomes))
    refreshTemplateFromMasterList(templateId)
    setSessionDirty(true)
    setRefreshNotedAt(Date.now())
  }

  function beginNameEdit(fromMenu = false) {
    if (!meta) return
    ignoreBlurRef.current = true
    if (fromMenu) focusNameAfterMenuCloseRef.current = true
    setNameDraft(meta.name)
    setEditingName(true)
  }

  function cancelNameEdit() {
    if (!meta) return
    setNameDraft(meta.name)
    setEditingName(false)
    focusNameAfterMenuCloseRef.current = false
  }

  function confirmNameEdit() {
    if (!meta || ignoreBlurRef.current) return
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === meta.name) {
      cancelNameEdit()
      return
    }
    setMeta(prev => (prev ? { ...prev, name: trimmed } : prev))
    setSessionDirty(true)
    setEditingName(false)
    focusNameAfterMenuCloseRef.current = false
  }

  function handleSettingsMenuCloseAutoFocus(event: Event) {
    if (!focusNameAfterMenuCloseRef.current) return
    event.preventDefault()
    focusNameAfterMenuCloseRef.current = false
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  const moduleActions = useMemo<ModuleActions>(
    () => ({
      onUpdate: (cardId, changes) => {
        setPayDateCards(prev => {
          const next = updatePayDateCardInList(prev, cardId, changes)
          return 'payDate' in changes || 'boardColumn' in changes
            ? sortPreviewPayDateCards(next)
            : next
        })
        setSessionDirty(true)
      },
      onBillToggle: () => {},
      onBillMove: (fromCardId, toCardId, billId, beforeBillId) => {
        setPayDateCards(prev => {
          const from = prev.find(m => m.id === fromCardId)
          if (!from) return prev
          const bill = from.bills.find(b => b.id === billId)
          if (!bill) return prev
          return prev.map(m => {
            if (m.id === fromCardId) {
              return { ...m, bills: m.bills.filter(b => b.id !== billId) }
            }
            if (m.id === toCardId) {
              return { ...m, bills: insertUnpaidBill(m.bills, bill, beforeBillId) }
            }
            return m
          })
        })
        setSessionDirty(true)
      },
      onBillAdd: (cardId, bill) => {
        setPayDateCards(prev =>
          prev.map(m => (m.id === cardId ? { ...m, bills: [...m.bills, bill] } : m))
        )
        setSessionDirty(true)
      },
      onCreditorAdd: (creditor: Creditor) => {
        addCreditor(creditor)
      },
      onBillUpdate: (cardId, billId, changes) => {
        setPayDateCards(prev =>
          prev.map(m =>
            m.id === cardId
              ? { ...m, bills: m.bills.map(b => (b.id === billId ? { ...b, ...changes } : b)) }
              : m
          )
        )
        setSessionDirty(true)
      },
      onBillRemove: (cardId, billId) => {
        setPayDateCards(prev =>
          prev.map(m =>
            m.id === cardId ? { ...m, bills: m.bills.filter(b => b.id !== billId) } : m
          )
        )
        setSessionDirty(true)
      },
      onNoteAdd: () => {},
      onNoteDelete: () => {},
      onNotesRead: () => {},
      onPayDateCardRemove: cardId => {
        setPayDateCards(prev => prev.filter(m => m.id !== cardId))
        setSessionDirty(true)
      },
      onPayDateCardDuplicate: sourceCard => {
        const cloneBills = sourceCard.bills.map(b => ({ ...b, id: generateId('tbill') }))
        const dup: PayDateCard = {
          ...sourceCard,
          id: generateId('tcard'),
          templatePayDateCardId: undefined,
          bills: cloneBills,
          notes: [] as Note[],
          isFromTemplate: false,
          sortOrder: sourceCard.sortOrder + 1,
        }
        setPayDateCards(prev => sortPreviewPayDateCards([...prev, dup]))
        setSessionDirty(true)
      },
      onHeaderColorSet: (card, hex) => {
        setPayDateCards(prev => updatePayDateCardInList(prev, card.id, { headerColor: hex }))
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

  const showStatus = sessionDirty || savedThisSession || refreshNotedAt !== null
  const statusText = sessionDirty
    ? 'Unsaved changes'
    : refreshNotedAt
      ? 'Refreshed from master list'
      : 'All changes saved'

  const statusClass = sessionDirty
    ? 'text-(--warning)'
    : refreshNotedAt
      ? 'text-(--info)'
      : 'text-(--green)'

  const isOnlyTemplate = templates.length === 1

  function handleDefaultMenuSelect() {
    if (!meta || isOnlyTemplate) return
    if (meta.isDefault) {
      const nextDefaultId = promoteNextDefaultTemplateId(templates, templateId)
      if (!nextDefaultId) return
      setDefaultTemplate(nextDefaultId)
      setMeta(prev => (prev ? { ...prev, isDefault: false } : prev))
      return
    }
    setDefaultTemplate(templateId)
    setMeta(prev => (prev ? { ...prev, isDefault: true } : prev))
  }

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="shrink-0 text-2xl font-semibold tracking-tight text-(--text-primary)">
              Editing Template:
            </span>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onBlur={confirmNameEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ignoreBlurRef.current = false
                    confirmNameEdit()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    cancelNameEdit()
                  }
                }}
                aria-label="Template name"
                className="min-w-0 flex-1 border-0 border-b border-(--navy) bg-transparent px-0 py-0 text-2xl font-semibold tracking-tight text-(--text-secondary) outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => beginNameEdit()}
                className="group/name inline-flex min-w-0 max-w-full cursor-pointer items-center gap-3 text-left transition duration-200 ease-out"
                title={`Rename ${meta.name}`}
                aria-label={`Rename ${meta.name}`}
              >
                <span className="min-w-0 truncate text-2xl font-semibold tracking-tight text-(--text-secondary) transition duration-200 ease-out group-hover/name:text-(--navy)">
                  {meta.name}
                </span>
                <Pencil
                  className="size-4 shrink-0 text-(--text-tertiary) transition duration-200 ease-out group-hover/name:text-(--navy)"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            )}
          </div>
          <p className="mt-2 text-[13px] text-(--text-secondary)">
            Template blueprint — pay dates use day-of-month (preview: {previewMonth}/{previewYear})
          </p>
          <div className="mt-3.5 min-h-[18px]">
            <p
              className={cn(
                'inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors duration-150',
                showStatus ? statusClass : 'invisible'
              )}
              aria-hidden={!showStatus}
            >
              {!sessionDirty && !refreshNotedAt ? (
                <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              ) : null}
              {showStatus ? statusText : 'All changes saved'}
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
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-input border border-border bg-(--bg-primary) text-(--text-secondary) shadow-(--shadow-sm) hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
                aria-label="Template settings"
              >
                <Settings className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onCloseAutoFocus={handleSettingsMenuCloseAutoFocus}>
              <DropdownMenuItem onSelect={() => beginNameEdit(true)}>Rename template</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={event => {
                  event.preventDefault()
                  handleRefresh()
                }}
              >
                Refresh from Master List
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isOnlyTemplate && meta.isDefault}
                onSelect={event => {
                  event.preventDefault()
                  handleDefaultMenuSelect()
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
              'btn-navy relative inline-flex h-9 cursor-pointer items-center px-3 text-[12px] font-semibold shadow-(--shadow-sm)'
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
            className="inline-flex h-9 cursor-pointer items-center rounded-input border border-(--navy) bg-(--navy-light) px-3 text-[12px] font-semibold text-(--navy) shadow-(--shadow-sm)"
          >
            Save Template &amp; Close
          </button>
        </div>
      </header>

      <BoardWorkspace
        boardId={`template-${templateId}`}
        payDateCards={payDateCards}
        month={previewMonth}
        year={previewYear}
        boardMode="template"
        users={data.users}
        incomeSources={data.incomes.map(income => income.name)}
        creditors={data.creditors}
        expenseCategoryDefinitions={data.expenseCategories}
        onCategoryCreate={addExpenseCategory}
        currentUserId={data.currentUserId}
        moduleActions={moduleActions}
        boardMaxWidthClass="max-w-[1560px]"
        payDateCardAddSlot={
          addingPayDateCard ? (
            <div ref={inlineFormRef} className="w-full max-w-[320px]">
              <PayDateCardInlineForm
                key={addFormSession}
                variant="template"
                template={meta}
                users={data.users}
                incomes={data.incomes}
                creditors={data.creditors}
                previewMonth={previewMonth}
                previewYear={previewYear}
                defaultOwnerId={data.currentUserId}
                onSave={newCard => {
                  setPayDateCards(prev => sortPreviewPayDateCards([...prev, newCard]))
                  setSessionDirty(true)
                  setAddingPayDateCard(false)
                }}
                onCancel={() => setAddingPayDateCard(false)}
              />
            </div>
          ) : (
            <PlaceholderCard
              label="Add pay date card"
              onClick={() => {
                setAddFormSession(s => s + 1)
                setAddingPayDateCard(true)
              }}
            />
          )
        }
      />

      <AppModal
        open={leaveDialogOpen}
        hideBody
        onClose={() => {
          cancelPendingLeave()
          setLeaveDialogOpen(false)
        }}
        title="Unsaved Changes"
        description="You have unsaved changes that will be lost if you leave."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                cancelPendingLeave()
                setLeaveDialogOpen(false)
              }}
              className="inline-flex h-9 cursor-pointer items-center rounded-input border border-border bg-(--bg-primary) px-4 text-[13px] font-medium text-(--text-secondary) hover:bg-(--bg-tertiary)"
            >
              Stay
            </button>
            <button
              type="button"
              onClick={() => {
                setSessionDirty(false)
                setLeaveDialogOpen(false)
                confirmPendingLeave()
              }}
              className="btn-danger inline-flex h-9 cursor-pointer items-center px-4 text-[13px] font-semibold"
            >
              Leave without saving
            </button>
          </>
        }
      />
    </div>
  )
}
