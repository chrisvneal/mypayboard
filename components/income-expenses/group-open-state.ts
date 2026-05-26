export type GroupOpenState = Record<string, boolean>

export function readGroupOpenState(storageKey: string): GroupOpenState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
    )
  } catch {
    return {}
  }
}

export function saveGroupOpenState(storageKey: string, state: GroupOpenState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // UI preference only; never block page interaction.
  }
}
