'use client'

import { useRouter } from 'next/navigation'
import { Check, Trash2 } from 'lucide-react'
import { ConfirmButton } from '@/components/ConfirmButton'
import {
  TEMPLATE_LIST_CARD_CLASS,
  TEMPLATE_LIST_CARD_INSET,
  TEMPLATE_LIST_CARD_WIDTH,
} from '@/components/templates/template-list-card-styles'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { formatTemplateLastSaved } from '@/lib/format'
import type { Template } from '@/lib/types'
import { useMyPayBoard } from '@/lib/useMyPayBoard'
import { cn } from '@/lib/utils'

type TemplateListCardProps = {
  template: Template
  owners: string
  showDefaultBadge: boolean
}

export function TemplateListCard({ template, owners, showDefaultBadge }: TemplateListCardProps) {
  const router = useRouter()
  const { deleteTemplate } = useMyPayBoard()

  const editHref = `${DASHBOARD_PATHS.settingsTemplates}/${template.id}/edit`
  const cardCount = template.payDateCards.length
  const cardCountLabel = `${cardCount} pay date card${cardCount === 1 ? '' : 's'}`

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(editHref)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(editHref)
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
            {showDefaultBadge ? (
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
            className="rounded-input text-(--text-tertiary) transition hover:text-(--danger) focus:opacity-100"
            icon={<Trash2 className="size-4" strokeWidth={2} />}
            confirmIcon={<Check className="size-4" strokeWidth={2.25} />}
            onConfirm={() => deleteTemplate(template.id)}
          />
        </div>
      </div>
    </div>
  )
}
