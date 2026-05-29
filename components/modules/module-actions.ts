import type { Bill, Creditor, Note, PayDateModule } from '@/lib/types'

export type ModuleActions = {
  onUpdate: (moduleId: string, changes: Partial<PayDateModule>) => void
  onBillToggle: (moduleId: string, billId: string) => void
  onBillMove: (
    fromModuleId: string,
    toModuleId: string,
    billId: string,
    beforeBillId?: string
  ) => void
  onBillAdd: (moduleId: string, bill: Bill) => void
  onCreditorAdd: (creditor: Creditor) => void
  onBillUpdate: (moduleId: string, billId: string, changes: Partial<Bill>) => void
  onBillRemove: (moduleId: string, billId: string) => void
  onNoteAdd: (moduleId: string, note: Note) => void
  onNoteDelete: (moduleId: string, noteId: string) => void
  onNotesRead: (moduleId: string) => void
  onModuleRemove: (moduleId: string) => void
  /** Pass the full source module so its personal header color can carry over. */
  onModuleDuplicate: (module: PayDateModule) => void
  /** Personal (per-user) header color choice — does not change shared board data. */
  onHeaderColorSet: (module: PayDateModule, hex: string) => void
}
