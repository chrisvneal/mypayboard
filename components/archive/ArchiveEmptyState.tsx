'use client'

import { Archive as ArchiveIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ArchiveEmptyStateProps = {
  title: string
  description?: string
  variant?: 'full' | 'tab'
}

export function ArchiveEmptyState({
  title,
  description,
  variant = 'tab',
}: ArchiveEmptyStateProps) {
  const isFull = variant === 'full'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isFull ? 'min-h-[52vh]' : 'min-h-48 rounded-lg border border-dashed border-[--module-divider-color] bg-(--bg-primary) px-6 py-10'
      )}
    >
      {isFull && <ArchiveIcon className="mb-4 size-8 text-(--text-tertiary)" />}
      <p className={cn('font-medium', isFull ? 'text-(--text-secondary)' : 'text-sm text-(--text-tertiary)')}>
        {title}
      </p>
      {description ? (
        <p className={cn(isFull ? 'mt-2.5 text-sm text-(--text-tertiary)' : 'mt-1.5 text-sm text-(--text-tertiary)')}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
