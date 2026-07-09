import type { MonthlyBoard, PayDateCard, Bill, Note, BoardColumn, BoardStatus } from '@/lib/types'
import { resolveOwnerUuid, ownerFromUuid, type SupabaseUser } from './owner'
import { isUuid } from '../is-uuid'

// ─── RPC payload (create_board — creation only, see Do Not Touch notes) ────

function billToJson(bill: Bill) {
  return {
    id: bill.id,
    creditorId: bill.creditorId && isUuid(bill.creditorId) ? bill.creditorId : null,
    name: bill.name,
    nameOverride: bill.nameOverride ?? null,
    amount: bill.amount,
    dueDate: bill.dueDate,
    category: bill.category ?? null,
    paid: bill.paid,
    muted: bill.muted,
    notes: bill.notes ?? '',
    origin: bill.origin,
    promotedToMaster: bill.promotedToMaster ?? false,
    rowColor: bill.rowColor ?? null,
  }
}

function noteToJson(note: Note, users: SupabaseUser[]) {
  return {
    id: note.id,
    authorId: resolveOwnerUuid(note.authorId, users),
    authorName: note.authorName,
    text: note.text,
    timestamp: note.timestamp,
  }
}

function cardToJson(card: PayDateCard, users: SupabaseUser[]) {
  return {
    id: card.id,
    templatePayDateCardId:
      card.templatePayDateCardId && isUuid(card.templatePayDateCardId) ? card.templatePayDateCardId : null,
    owner: resolveOwnerUuid(card.owner, users),
    source: card.source,
    payDate: card.payDate,
    payAmount: card.payAmount ?? null,
    isFromTemplate: card.isFromTemplate,
    sortOrder: card.sortOrder,
    boardColumn: card.boardColumn ?? null,
    headerColor: card.headerColor ?? null,
    bills: card.bills.filter(b => isUuid(b.id)).map(billToJson),
    notes: card.notes.filter(n => isUuid(n.id)).map(n => noteToJson(n, users)),
  }
}

/**
 * pay_date_cards.owner is nullable (a NULL owner reads back as 'shared' —
 * see cardFromRow below), but notes.author_id is still NOT NULL — a note
 * always has a real writer, "Shared" isn't a meaningful author. The RPC
 * will hard-fail if any note's author can't be resolved to a real household
 * member, so check this before calling create_board at all, since the RPC
 * is one atomic transaction: one bad note fails the whole board.
 */
export function hasResolvableOwners(board: MonthlyBoard, users: SupabaseUser[]): boolean {
  return board.payDateCards.every(card =>
    card.notes.every(note => resolveOwnerUuid(note.authorId, users) != null)
  )
}

/** Builds the args object for the `create_board` RPC — board creation only. */
export function toRpcArgs(board: MonthlyBoard, householdId: string, users: SupabaseUser[]) {
  return {
    p_household_id: householdId,
    p_id: board.id,
    p_month: board.month,
    p_year: board.year,
    p_label: board.label,
    p_template_id: board.templateId && isUuid(board.templateId) ? board.templateId : null,
    p_status: board.status,
    p_cards: board.payDateCards.filter(c => isUuid(c.id)).map(c => cardToJson(c, users)),
    p_notes: board.sharedNotes.filter(n => isUuid(n.id)).map(n => noteToJson(n, users)),
  }
}

// ─── Read direction: joined Supabase rows -> MonthlyBoard ──────────────────

type RawNoteRow = {
  id: string
  author_id: string
  author_name: string
  text: string
  timestamp: string
}

type RawBillRow = {
  id: string
  creditor_id: string | null
  name: string
  name_override: string | null
  amount: number
  due_date: string
  category: string | null
  paid: boolean
  muted: boolean
  notes: string
  origin: string
  promoted_to_master: boolean
  row_color: string | null
}

type RawCardRow = {
  id: string
  template_pay_date_card_id: string | null
  owner: string | null
  source: string
  pay_date: string
  pay_amount: number | null
  is_from_template: boolean
  sort_order: number
  board_column: number | null
  header_color: string | null
  bills: RawBillRow[] | null
  notes: RawNoteRow[] | null
}

type RawBoardRow = {
  id: string
  month: number
  year: number
  label: string
  template_id: string | null
  status: string
  created_at: string
  updated_at: string
  pay_date_cards: RawCardRow[] | null
  notes: RawNoteRow[] | null
}

/**
 * PostgREST embedded-resource select shape for the read path. `notes` has
 * two nullable FKs (pay_date_card_id, board_id) so each embed must specify
 * which one to disambiguate — `!column_name` picks the relationship.
 */
export const BOARD_SELECT =
  '*, pay_date_cards(*, bills(*), notes!pay_date_card_id(*)), notes!board_id(*)'

export function noteFromRow(row: RawNoteRow, users: SupabaseUser[]): Note {
  return {
    id: row.id,
    authorId: ownerFromUuid(row.author_id, users) ?? row.author_id,
    authorName: row.author_name,
    text: row.text,
    timestamp: row.timestamp,
  }
}

function billFromRow(row: RawBillRow): Bill {
  return {
    id: row.id,
    name: row.name,
    nameOverride: row.name_override ?? undefined,
    amount: row.amount,
    dueDate: row.due_date,
    category: row.category ?? undefined,
    paid: row.paid,
    muted: row.muted,
    notes: row.notes ?? '',
    origin: row.origin as Bill['origin'],
    creditorId: row.creditor_id ?? undefined,
    promotedToMaster: row.promoted_to_master,
    rowColor: row.row_color ?? undefined,
  }
}

function cardFromRow(row: RawCardRow, users: SupabaseUser[]): PayDateCard {
  return {
    id: row.id,
    templatePayDateCardId: row.template_pay_date_card_id ?? undefined,
    // NULL owner means the card was saved as 'shared' (resolveOwnerUuid maps
    // 'shared' -> NULL on write). A non-null uuid that doesn't match any
    // current household member falls back to the raw uuid rather than
    // dropping the value.
    owner: row.owner === null ? 'shared' : (ownerFromUuid(row.owner, users) ?? row.owner),
    source: row.source,
    payDate: row.pay_date,
    payAmount: row.pay_amount,
    bills: (row.bills ?? []).map(billFromRow),
    notes: (row.notes ?? []).map(n => noteFromRow(n, users)),
    isFromTemplate: row.is_from_template,
    sortOrder: row.sort_order,
    boardColumn: (row.board_column as BoardColumn | null) ?? undefined,
    headerColor: row.header_color ?? undefined,
  }
}

export function fromRow(row: RawBoardRow, users: SupabaseUser[]): MonthlyBoard {
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    label: row.label,
    templateId: row.template_id ?? undefined,
    payDateCards: (row.pay_date_cards ?? []).map(c => cardFromRow(c, users)),
    status: row.status as BoardStatus,
    sharedNotes: (row.notes ?? []).map(n => noteFromRow(n, users)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Direct single-row writes (non-RPC mutators) ───────────────────────────

export function boardToRow(board: MonthlyBoard, householdId: string): Record<string, unknown> {
  return {
    id: board.id,
    household_id: householdId,
    month: board.month,
    year: board.year,
    label: board.label,
    template_id: board.templateId && isUuid(board.templateId) ? board.templateId : null,
    status: board.status,
    updated_at: new Date().toISOString(),
  }
}

export function cardToRow(
  card: PayDateCard,
  boardId: string,
  householdId: string,
  users: SupabaseUser[]
): Record<string, unknown> {
  return {
    id: card.id,
    household_id: householdId,
    board_id: boardId,
    template_pay_date_card_id:
      card.templatePayDateCardId && isUuid(card.templatePayDateCardId) ? card.templatePayDateCardId : null,
    owner: resolveOwnerUuid(card.owner, users),
    source: card.source,
    pay_date: card.payDate,
    pay_amount: card.payAmount ?? null,
    is_from_template: card.isFromTemplate,
    sort_order: card.sortOrder,
    board_column: card.boardColumn ?? null,
    header_color: card.headerColor ?? null,
  }
}

export function billToRow(bill: Bill, cardId: string, householdId: string): Record<string, unknown> {
  return {
    id: bill.id,
    household_id: householdId,
    pay_date_card_id: cardId,
    creditor_id: bill.creditorId && isUuid(bill.creditorId) ? bill.creditorId : null,
    name: bill.name,
    name_override: bill.nameOverride ?? null,
    amount: bill.amount,
    due_date: bill.dueDate,
    category: bill.category ?? null,
    paid: bill.paid,
    muted: bill.muted,
    notes: bill.notes ?? '',
    origin: bill.origin,
    promoted_to_master: bill.promotedToMaster ?? false,
    row_color: bill.rowColor ?? null,
  }
}

export function noteToRow(
  note: Note,
  parent: { cardId: string } | { boardId: string },
  householdId: string,
  users: SupabaseUser[]
): Record<string, unknown> {
  return {
    id: note.id,
    household_id: householdId,
    pay_date_card_id: 'cardId' in parent ? parent.cardId : null,
    board_id: 'boardId' in parent ? parent.boardId : null,
    author_id: resolveOwnerUuid(note.authorId, users),
    author_name: note.authorName,
    text: note.text,
    timestamp: note.timestamp,
  }
}
