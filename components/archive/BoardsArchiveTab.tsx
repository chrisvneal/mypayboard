'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarRange, Check, RotateCcw, Trash2, Users } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { getArchivedBoardCreatorLabel } from '@/lib/template-owner-label'
import type { MonthlyBoard, Template, User } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ArchiveEmptyState } from './ArchiveEmptyState'

type BoardsArchiveTabProps = {
  boards: MonthlyBoard[]
  templates: Template[]
  users: User[]
  currentUserId: string
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function BoardsArchiveTab({
  boards,
  templates,
  users,
  currentUserId,
  onRestore,
  onDelete,
}: BoardsArchiveTabProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }
  }, [])

  useEffect(() => {
    if (!pendingDeleteId) return

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Element
      if (target.closest('[data-archived-board-delete-action]')) return
      setPendingDeleteId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [pendingDeleteId])

  if (boards.length === 0) {
    return (
      <ArchiveEmptyState
        title="No archived boards."
        description="Archived month boards will appear here."
      />
    )
  }

  const sorted = [...boards].sort((a, z) => z.year - a.year || z.month - a.month)

  return (
    <section className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map(board => (
        <article
          key={board.id}
          className="rounded-lg border border-border bg-(--bg-primary) px-4 pt-4 pb-2.5 shadow-(--shadow-sm) transition-colors duration-200 ease-out hover:bg-(--bg-tertiary)"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-(--text-primary)">{board.label}</h3>
              <span
                className="rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary)"
                aria-hidden
              >
                Archived
              </span>
            </div>
            <p className="mt-1 text-[12px] text-(--text-tertiary)">
              Archived {formatDate(board.updatedAt)}
            </p>
          </div>

          <dl className="mt-4 space-y-2 text-[12px] text-(--text-secondary)">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-3.5 text-(--text-tertiary)" />
              <span>{board.payDateCards.length} pay date card{board.payDateCards.length === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-3.5 text-(--text-tertiary)" />
              <span className="truncate">
                {getArchivedBoardCreatorLabel(board, templates, users, currentUserId)}
              </span>
            </div>
          </dl>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={() => onRestore(board.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-(--text-tertiary) transition duration-200 ease-out hover:text-(--text-primary)"
            >
              <RotateCcw className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
              Restore
            </button>
            <div className="flex items-center gap-3" onPointerEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current) }} onPointerLeave={() => { leaveTimer.current = setTimeout(() => setPendingDeleteId(null), 600) }}>
              <button
                type="button"
                data-archived-board-delete-action
                onMouseDown={e => e.stopPropagation()}
                onClick={() => {
                  if (pendingDeleteId === board.id) {
                    onDelete(board.id)
                    setPendingDeleteId(null)
                  } else {
                    setPendingDeleteId(board.id)
                  }
                }}
                aria-label={pendingDeleteId === board.id ? `Confirm delete ${board.label}` : `Delete ${board.label}`}
                className={cn(
                  'inline-flex size-7 cursor-pointer items-center justify-center transition duration-200 ease-out hover:text-(--danger)',
                  pendingDeleteId === board.id ? 'text-(--danger)' : 'text-(--danger-muted)'
                )}
              >
                {pendingDeleteId === board.id
                  ? <Check className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  : <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                }
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
