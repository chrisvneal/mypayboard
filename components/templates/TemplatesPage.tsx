'use client'

import { useMemo, useState } from 'react'
import { CreateTemplateModal } from '@/components/CreateTemplateModal'
import { PlaceholderCard } from '@/components/PlaceholderCard'
import { TemplateListCard } from '@/components/templates/TemplateListCard'
import { sortTemplatesForDisplay } from '@/lib/template-utils'
import { getTemplateCardOwnerLabel } from '@/lib/template-owner-label'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export function TemplatesPage() {
  const { templates, isLoaded, data } = useMyPayBoard()
  const sortedTemplates = useMemo(() => sortTemplatesForDisplay(templates), [templates])
  const [createOpen, setCreateOpen] = useState(false)

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

      <div className="flex flex-wrap justify-center gap-5 md:justify-start">
        {sortedTemplates.map(template => (
          <TemplateListCard
            key={template.id}
            template={template}
            owners={getTemplateCardOwnerLabel(template, data.users, data.currentUserId)}
            showDefaultBadge={templates.length === 1 || template.isDefault}
          />
        ))}
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
