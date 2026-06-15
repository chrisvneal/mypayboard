'use client'

import { useEffect, useState } from 'react'
import { CalendarRange, Check, RotateCcw, Trash2, Users } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { MonthlyBoard, User } from '@/lib/types'
import { ArchiveEmptyState } from './ArchiveEmptyState'

type BoardsArchiveTabProps = {
  boards: MonthlyBoard[]
  users: User[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

function sharedUsersLabel(board: MonthlyBoard, users: User[]): string {
  const ownerIds = new Set(board.payDateCards.map(card => card.owner))
  const names = users
    .filter(user => ownerIds.has(user.id))
    .map(user => user.name)
    .sort((a, z) => a.localeCompare(z))
  if (names.length === 0) return 'No assigned users'
  return names.join(' + ')
}

export function BoardsArchiveTab({ boards, users, onRestore, onDelete }: BoardsArchiveTabProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

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
          className="rounded-lg border border-border bg-(--bg-primary) p-4 shadow-(--shadow-sm)"
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
              <span className="truncate">{sharedUsersLabel(board, users)}</span>
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
            <div className="flex items-center gap-3" onPointerLeave={() => setPendingDeleteId(null)}>
              {pendingDeleteId === board.id ? (
                <button
                  type="button"
                  data-archived-board-delete-action
                  onClick={() => { onDelete(board.id); setPendingDeleteId(null) }}
                  aria-label={`Confirm delete ${board.label}`}
                  className="inline-flex cursor-pointer items-center rounded-md p-1 text-(--danger-muted) transition duration-150 ease-out hover:bg-(--bg-secondary) hover:text-(--danger)"
                >
                  <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  data-archived-board-delete-action
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setPendingDeleteId(board.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-(--danger-muted) transition duration-200 ease-out hover:text-(--danger)"
                >
                  <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  Delete
                </button>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
