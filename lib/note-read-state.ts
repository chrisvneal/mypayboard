import type { Note } from './types'

export function coerceReadNoteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string')
}

/** Per-user read state — notes from other authors are unread until marked read. */
export function isNoteUnread(
  note: Note,
  viewerId: string,
  readNoteIds: ReadonlySet<string> | readonly string[]
): boolean {
  if (note.authorId === viewerId) return false
  const read = readNoteIds instanceof Set ? readNoteIds : new Set(readNoteIds)
  return !read.has(note.id)
}
