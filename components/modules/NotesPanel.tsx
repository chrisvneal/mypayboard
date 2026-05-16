'use client'

import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Note } from '@/lib/types'
import { cn } from '@/lib/utils'

export type NotesPanelProps = {
  notes: Note[]
  currentUserId: string
  onNoteDelete: (noteId: string) => void
  onNotePost: (text: string) => void
}

export function NotesPanel({
  notes,
  currentUserId,
  onNoteDelete,
  onNotePost,
}: NotesPanelProps) {
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)

  const sorted = useMemo(
    () => [...notes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [notes]
  )

  return (
    <div className="flex min-h-[180px] flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-2 pt-1">
        {sorted.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center px-4 text-center text-[13px] text-[var(--text-tertiary)]">
            No notes yet. Leave a message for the other person.
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map(note => {
              const initial = note.authorName.trim().charAt(0).toUpperCase()
              const isChris = note.authorId === 'user-chris'
              const isNicole = note.authorId === 'user-nicole'
              const unreadOther = note.unread && note.authorId !== currentUserId
              const ts = new Date(note.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })

              return (
                <li
                  key={note.id}
                  className={cn(
                    'group relative rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-[var(--bg-tertiary)]/50',
                    unreadOther && 'border-l-4 border-[var(--navy)] pl-2'
                  )}
                >
                  <div className="flex gap-2">
                    <div
                      className={cn(
                        'avatar text-[11px]',
                        isChris ? 'avatar-chris' : isNicole ? 'avatar-nicole' : ''
                      )}
                      style={
                        !isChris && !isNicole
                          ? {
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                            }
                          : undefined
                      }
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold">{note.authorName}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{ts}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug text-[var(--text-secondary)]">
                        {note.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Delete note"
                      className="shrink-0 self-start rounded-md p-1 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:bg-[var(--danger-light)] hover:text-[var(--danger)] group-hover:opacity-100"
                      onClick={() => onNoteDelete(note.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-3 py-2">
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onFocus={() => {
              setExpanded(true)
            }}
            rows={expanded ? 4 : 2}
            placeholder="Write a note…"
            className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-transparent px-2 py-2 text-[13px] outline-none transition-[min-height] duration-150 ease-out focus:border-[var(--navy)]"
          />
          <button
            type="button"
            className="h-9 shrink-0 self-end rounded-lg bg-[var(--navy)] px-3 text-[13px] font-medium text-white hover:bg-[var(--navy-dark)]"
            onClick={() => {
              const text = draft.trim()
              if (!text) return
              onNotePost(text)
              setDraft('')
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
