import type { IncomeExpenseView } from './ViewToggle'

export function readViewState(storageKey: string): IncomeExpenseView {
  if (typeof window === 'undefined') return 'grouped'
  try {
    const raw = localStorage.getItem(storageKey)
    return raw === 'list' || raw === 'grouped' ? raw : 'grouped'
  } catch {
    return 'grouped'
  }
}

export function saveViewState(storageKey: string, view: IncomeExpenseView) {
  try {
    localStorage.setItem(storageKey, view)
  } catch {
    // UI preference only; never block page interaction.
  }
}
