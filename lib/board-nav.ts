import type { MonthlyBoard } from '@/lib/types'

/** Non-archived boards in sidebar nav order (oldest → newest). */
export function visibleNavBoards(boards: MonthlyBoard[]): MonthlyBoard[] {
  return [...boards]
    .filter(b => b.status !== 'archived')
    .sort((a, z) => a.year - z.year || a.month - z.month)
}

/** Chronologically latest board — bottom item in the sidebar pay board list. */
export function bottomMostNavBoard(boards: MonthlyBoard[]): MonthlyBoard | undefined {
  const visible = visibleNavBoards(boards)
  return visible.at(-1)
}
