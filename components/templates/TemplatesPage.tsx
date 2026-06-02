'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical } from 'lucide-react'
import { CreateTemplateModal } from '@/components/CreateTemplateModal'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { formatTemplateLastSaved } from '@/lib/format'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export function TemplatesPage() {
  const router = useRouter()
  const { templates, isLoaded, deleteTemplate, setDefaultTemplate } = useMyPayBoard()
  const [createOpen, setCreateOpen] = useState(false)

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(240px,280px))]">
        {templates.map(template => {
          const cardCount = template.payDateCards.length
          const summary = `${cardCount} pay date card${cardCount === 1 ? '' : 's'} · ${userNamesForTemplate(template.assignedUserIds)}`
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
              className="group relative min-h-[168px] cursor-pointer rounded-lg border border-border bg-(--bg-primary) p-4 shadow-(--shadow-sm) transition hover:border-(--navy)/30 hover:bg-(--bg-secondary)/30 hover:shadow-(--shadow-md)"
            >
              <div className="flex items-start gap-2 pr-8">
                <h2 className="text-lg font-semibold text-(--text-primary)">{template.name}</h2>
                {template.isDefault ? (
                  <span className="shrink-0 rounded-full bg-(--green-light) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--green)">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[13px] text-(--text-secondary)">{summary}</p>
              <p className="mt-3 text-[12px] text-(--text-tertiary)">
                Last saved {formatTemplateLastSaved(template.updatedAt)}
              </p>
              <div
                className="absolute top-3 right-3"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => e.stopPropagation()}
              >
                <DropdownMenu>
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
                      onSelect={() => deleteTemplate(template.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
        <PlaceholderCard
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
