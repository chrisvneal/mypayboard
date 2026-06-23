'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2 } from 'lucide-react'
import { ConfirmButton } from '@/components/ConfirmButton'
import { CreateTemplateModal } from '@/components/CreateTemplateModal'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import {
  TEMPLATE_LIST_CARD_CLASS,
  TEMPLATE_LIST_CARD_INSET,
  TEMPLATE_LIST_CARD_WIDTH,
} from '@/components/templates/template-list-card-styles'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { formatTemplateLastSaved } from '@/lib/format'
import { sortTemplatesForDisplay } from '@/lib/template-utils'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

export function TemplatesPage() {
  const router = useRouter()
  const { templates, isLoaded, deleteTemplate, data } = useMyPayBoard()
  const sortedTemplates = useMemo(() => sortTemplatesForDisplay(templates), [templates])
  const [createOpen, setCreateOpen] = useState(false)

  function userNamesForTemplate(assignedUserIds: string[]): string {
    return assignedUserIds
      .map(id => data.users.find(u => u.id === id)?.name ?? id)
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

      <div className="flex flex-wrap justify-center gap-5 md:justify-start">
        {sortedTemplates.map(template => {
          const cardCount = template.payDateCards.length
          const cardCountLabel = `${cardCount} pay date card${cardCount === 1 ? '' : 's'}`
          const owners = userNamesForTemplate(template.assignedUserIds)

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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-(--text-primary)">{template.name}</h2>
                    {templates.length === 1 || template.isDefault ? (
                      <span
                        className="rounded-full bg-(--green-light) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--green)"
                        aria-hidden
                      >
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] text-(--text-secondary)">{owners}</p>
                  <div className="mt-5 space-y-1 text-[12px] leading-relaxed text-(--text-tertiary)">
                    <p>{cardCountLabel}</p>
                    <p>Last saved {formatTemplateLastSaved(template.updatedAt)}</p>
                  </div>
                </div>

                <div
                  className="shrink-0"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => e.stopPropagation()}
                >
                  <ConfirmButton
                    label="Delete template"
                    confirmLabel="Confirm delete"
                    title="Delete template"
                    aria-label={`Delete ${template.name}`}
                    className="rounded-md text-(--text-tertiary) transition hover:text-(--danger) focus:opacity-100"
                    icon={<Trash2 className="size-4" strokeWidth={2} />}
                    confirmIcon={<Check className="size-4" strokeWidth={2.25} />}
                    onConfirm={() => deleteTemplate(template.id)}
                  />
                </div>
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
