'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, MoreVertical } from 'lucide-react'
import { CreateTemplateModal } from '@/components/CreateTemplateModal'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import {
  TEMPLATE_LIST_CARD_CLASS,
  TEMPLATE_LIST_CARD_INSET,
  TEMPLATE_LIST_CARD_WIDTH,
} from '@/components/templates/template-list-card-styles'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { formatTemplateLastSaved } from '@/lib/format'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

export function TemplatesPage() {
  const router = useRouter()
  const { templates, isLoaded, deleteTemplate, setDefaultTemplate } = useMyPayBoard()
  const [createOpen, setCreateOpen] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function userNamesForTemplate(assignedUserIds: string[]): string {
    return assignedUserIds
      .map(id => (id === 'user-chris' ? 'Chris' : id === 'user-nicole' ? 'Nicole' : id))
      .join(' & ')
  }

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary)">
        Loading templates...
      </div>
    )
  }

  const editHref = (id: string) => `${DASHBOARD_PATHS.settingsTemplates}/${id}/edit`

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">
            Templates
          </h1>
          <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-(--text-secondary)">
            Manage reusable monthly board structures
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-5">
        {templates.map(template => {
          const cardCount = template.payDateCards.length
          const cardCountLabel = `${cardCount} pay date card${cardCount === 1 ? '' : 's'}`
          const owners = userNamesForTemplate(template.assignedUserIds)
          const menuOpen = menuOpenId === template.id
          const deleteConfirm = deleteConfirmId === template.id

          return (
            <div
              key={template.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(editHref(template.id))}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(editHref(template.id))
                }
              }}
              className={cn(
                'group relative cursor-pointer',
                TEMPLATE_LIST_CARD_WIDTH,
                TEMPLATE_LIST_CARD_CLASS,
                TEMPLATE_LIST_CARD_INSET
              )}
            >
              {templates.length === 1 || template.isDefault ? (
                <span
                  className="absolute top-4 right-11 rounded-full bg-(--green-light) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--green)"
                  aria-hidden
                >
                  Default
                </span>
              ) : null}

              <div className="pr-10">
                <h2 className="text-lg font-semibold text-(--text-primary)">{template.name}</h2>
                <p className="mt-1 text-[13px] text-(--text-secondary)">{owners}</p>
                <div className="mt-5 space-y-1 text-[12px] leading-relaxed text-(--text-tertiary)">
                  <p>{cardCountLabel}</p>
                  <p>Last saved {formatTemplateLastSaved(template.updatedAt)}</p>
                </div>
              </div>

              <div
                className="absolute top-3 right-3"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              >
                <DropdownMenu
                  open={menuOpen}
                  onOpenChange={open => {
                    if (!open) {
                      setMenuOpenId(null)
                      setDeleteConfirmId(null)
                    } else {
                      setMenuOpenId(template.id)
                      setDeleteConfirmId(null)
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition group-hover:opacity-100 hover:bg-(--bg-tertiary) hover:text-(--text-primary) focus:opacity-100"
                      aria-label={`Actions for ${template.name}`}
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => router.push(editHref(template.id))}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={template.isDefault}
                      onSelect={() => setDefaultTemplate(template.id)}
                    >
                      Set as Default
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-(--danger)"
                      onSelect={event => {
                        event.preventDefault()
                        if (!deleteConfirm) {
                          setDeleteConfirmId(template.id)
                          return
                        }
                        deleteTemplate(template.id)
                        setDeleteConfirmId(null)
                        setMenuOpenId(null)
                      }}
                    >
                      {deleteConfirm ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="size-3.5" aria-hidden />
                          Confirm delete
                        </span>
                      ) : (
                        'Delete'
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
        <PlaceholderCard
          variant="template-list"
          label={templates.length === 0 ? 'Create your first template' : 'Add new template'}
          description={
            templates.length === 0
              ? undefined
              : 'Click to create another reusable monthly template.'
          }
          icon={templates.length === 0 ? 'layout' : 'plus'}
          onClick={() => setCreateOpen(true)}
        />
      </div>

      <CreateTemplateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
