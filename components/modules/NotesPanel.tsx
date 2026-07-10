'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Send, Trash2 } from 'lucide-react'
import { ConfirmButton } from '@/components/ConfirmButton'
import { resolveUserAvatarStyle } from '@/components/modules/header-colors'
import { useMyPayBoard } from '@/lib/MyPayBoardProvider'
import type { Note } from '@/lib/types'
import { cn } from '@/lib/utils'

export type NotesPanelProps = {
  notes: Note[]
  currentUserId: string
  readNoteIds: ReadonlySet<string> | readonly string[]
  onNoteDelete: (noteId: string) => void
  onNotePost: (text: string) => void
  /** Live board: panel grows with notes instead of scrolling inside a fixed overlay */
  layout?: 'fixed' | 'flow'
  /** False when the panel is hidden behind another tab — resets expanded state invisibly. */
  isVisible?: boolean
}

export function NotesPanel({
  notes,
  currentUserId,
  readNoteIds,
  onNoteDelete,
  onNotePost,
  layout = 'fixed',
  isVisible = true,
}: NotesPanelProps) {
  const { data } = useMyPayBoard()
  const users = data.users

  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  // Oldest first → newest at the bottom (natural chat reading order).
  const sorted = useMemo(
    () => [...notes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [notes]
  )

  // When the panel is hidden behind another tab, collapse the textarea invisibly
  // so it returns to its resting state when the user comes back.
  useEffect(() => {
    if (!isVisible) setExpanded(false)
  }, [isVisible])

  // Keep the newest note (bottom) in view on open and whenever a note is added.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [notes.length])

  const canSubmit = draft.trim().length > 0

  function submitNote() {
    const text = draft.trim()
    if (!text) return
    onNotePost(text)
    setDraft('')
    setExpanded(false)
  }

  function handleDraftKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitNote()
    }
  }

  const flowLayout = layout === 'flow'

  return (
    <div
      className={cn(
        'flex flex-col',
        flowLayout ? 'min-h-full' : 'min-h-0 flex-1'
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          'module-tab-content-zone pb-2 pt-1',
          sorted.length === 0 && 'is-empty',
          flowLayout && sorted.length === 0 && 'flex-1',
          !flowLayout && 'scrollbar-thin min-h-0 flex-1 overflow-y-auto'
        )}
      >
        {sorted.length === 0 ? (
          <p className="module-tab-empty">Leave a message.</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map(note => {
              const initial = note.authorName.trim().charAt(0).toUpperCase()
              const author = users.find(u => u.id === note.authorId)
              const ts = new Date(note.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })

              return (
                <li
                  key={note.id}
                  className="group relative rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-tertiary)_50%,transparent)]"
                >
                  <div className="flex gap-2">
                    <div
                      className="avatar text-[11px]"
                      style={resolveUserAvatarStyle(author?.avatarColor)}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold">{note.authorName}</span>
                        <span className="text-[11px] text-(--text-tertiary)">{ts}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-snug text-(--text-secondary)">
                        {note.text}
                      </p>
                    </div>
                    <ConfirmButton
                      label="Delete message"
                      confirmLabel="Confirm delete?"
                      title="Delete message"
                      aria-label="Delete message"
                      className="shrink-0 self-center opacity-0 transition-opacity hover:text-(--danger) group-hover:opacity-100"
                      icon={<Trash2 className="size-4" />}
                      confirmIcon={<Check className="size-4" />}
                      onConfirm={() => onNoteDelete(note.id)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="module-tab-composer shrink-0 border-t border-border bg-(--bg-primary) py-3">
        <div className="flex items-end gap-3">
          <textarea
            ref={draftRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onFocus={() => {
              setExpanded(true)
              requestAnimationFrame(() => {
                draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              })
            }}
            onBlur={(e) => {
              // Skip collapse when focus moves to a tab button — the panel is
              // about to hide anyway and collapsing first causes a visible snap.
              const movingToTab = (e.relatedTarget as Element | null)?.getAttribute('role') === 'tab'
              if (!draft.trim() && !movingToTab) setExpanded(false)
            }}
            onKeyDown={handleDraftKeyDown}
            rows={expanded ? 3 : 2}
            placeholder="Write a message…"
            className="field-control min-h-0 flex-1 resize-none border border-border px-3 py-2 text-[13px] outline-none focus:border-[#cacaca]"
          />
          <button
            type="button"
            aria-label="Send message"
            disabled={!canSubmit}
            className={cn(
              'inline-flex size-11 xl:size-9 shrink-0 items-center justify-center rounded-input text-(--navy) transition-colors duration-150 hover:bg-(--bg-tertiary) hover:text-(--navy-dark)',
              !canSubmit && 'cursor-not-allowed opacity-40'
            )}
            onClick={submitNote}
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
