'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LayoutGrid, MoreVertical, Plus } from 'lucide-react'
import { CreateTemplateModal } from '@/components/CreateTemplateModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { formatDate } from '@/lib/format'
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

      {templates.length === 0 ? (
        <div className="flex min-h-[58vh] flex-col items-center justify-center py-8 text-center">
          <LayoutGrid className="mb-5 size-8 text-(--text-tertiary)" />
          <p className="font-medium text-(--text-secondary)">No templates yet</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-(--text-tertiary)">
            Templates are the foundation for creating monthly boards. Build one to get started.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-6 inline-flex h-9 cursor-pointer items-center rounded-lg bg-(--navy) px-4 text-[13px] font-semibold text-white shadow-(--shadow-sm) hover:bg-(--navy-dark)"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map(template => {
            const moduleCount = template.payDateModules.length
            const summary = `${moduleCount} pay module${moduleCount === 1 ? '' : 's'} · ${userNamesForTemplate(template.assignedUserIds)}`
            return (
              <div
                key={template.id}
                className="group relative rounded-lg border border-border bg-(--bg-primary) p-4 shadow-(--shadow-sm) transition hover:border-(--navy)/30 hover:shadow-(--shadow-md)"
              >
                <Link
                  href={`${DASHBOARD_PATHS.settingsTemplates}/${template.id}/edit`}
                  className="block no-underline"
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
                    Last saved {formatDate(template.updatedAt)}
                  </p>
                </Link>
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                    >
                      <button
                        type="button"
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-(--text-tertiary) opacity-0 transition group-hover:opacity-100 hover:bg-(--bg-tertiary) hover:text-(--text-primary) focus:opacity-100"
                        aria-label={`Actions for ${template.name}`}
                        onClick={e => e.preventDefault()}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          router.push(`${DASHBOARD_PATHS.settingsTemplates}/${template.id}/edit`)
                        }
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
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="group flex min-h-[168px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-(--bg-secondary)/60 px-4 py-6 text-center transition duration-200 ease-out hover:border-(--navy)/40 hover:bg-(--navy-light)/45"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-(--bg-primary) text-(--navy) shadow-(--shadow-sm) transition group-hover:border-(--navy)/30 group-hover:bg-(--navy-light)">
              <Plus className="size-4" strokeWidth={2.25} />
            </span>
            <span className="text-[13px] font-medium text-(--text-secondary) group-hover:text-(--navy)">
              Add new template
            </span>
            <span className="max-w-[220px] text-[11px] leading-snug text-(--text-tertiary)">
              Click to create another reusable monthly template.
            </span>
          </button>
        </div>
      )}

      <CreateTemplateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
