import type { Bill, Creditor, Note, PayDateCard } from '@/lib/types'

export type ModuleActions = {
  onUpdate: (cardId: string, changes: Partial<PayDateCard>) => void
  onBillToggle: (cardId: string, billId: string) => void
  onBillMove: (
    fromCardId: string,
    toCardId: string,
    billId: string,
    beforeBillId?: string
  ) => void
  onBillAdd: (cardId: string, bill: Bill) => void
  onCreditorAdd: (creditor: Creditor) => void
  onBillUpdate: (cardId: string, billId: string, changes: Partial<Bill>) => void
  onBillRemove: (cardId: string, billId: string) => void
  onNoteAdd: (cardId: string, note: Note) => void
  onNoteDelete: (cardId: string, noteId: string) => void
  onNotesRead: (cardId: string) => void
  onPayDateCardRemove: (cardId: string) => void
  /** Pass the full source card so its personal header color can carry over. */
  onPayDateCardDuplicate: (card: PayDateCard) => void
  /** Personal (per-user) header color choice — does not change shared board data. */
  onHeaderColorSet: (card: PayDateCard, hex: string) => void
  /** Template editor: unarchive a master-list expense (immediate, not template save). */
  onRestoreCreditorInMasterList?: (creditorId: string) => void
}
