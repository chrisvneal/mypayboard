import type { Template, TemplatePayDateCard, TemplateBill, BoardColumn } from '@/lib/types'
import { resolveOwnerUuid, ownerFromUuid, type SupabaseUser } from './owner'
import { isUuid } from '../is-uuid'

// ─── Write direction: Template -> create_template RPC args ────────────────

function billToJson(bill: TemplateBill) {
  return {
    id: bill.id,
    masterListId: bill.masterListId && isUuid(bill.masterListId) ? bill.masterListId : null,
    name: bill.name,
    nameOverride: bill.nameOverride ?? null,
    amount: bill.amount,
    dueDate: bill.dueDate,
    category: bill.category,
    isOneOff: bill.isOneOff ?? false,
  }
}

function cardToJson(card: TemplatePayDateCard, users: SupabaseUser[]) {
  return {
    id: card.id,
    assignedUserId: resolveOwnerUuid(card.assignedUserId, users),
    incomeSourceId: card.incomeSourceId && isUuid(card.incomeSourceId) ? card.incomeSourceId : null,
    defaultPayAmount: card.defaultPayAmount,
    defaultPayDate: card.defaultPayDate,
    defaultPayDateMonthOffset: card.defaultPayDateMonthOffset ?? 0,
    boardColumn: card.boardColumn ?? null,
    headerColor: card.headerColor ?? null,
    bills: card.bills.filter(b => isUuid(b.id)).map(billToJson),
  }
}

/** Builds the args object for the `create_template` RPC (used for both create and update). */
export function toRpcArgs(template: Template, householdId: string, users: SupabaseUser[]) {
  return {
    p_household_id: householdId,
    p_id: template.id,
    p_name: template.name,
    p_is_default: template.isDefault,
    p_cards: template.payDateCards.filter(c => isUuid(c.id)).map(c => cardToJson(c, users)),
    p_assigned_user_ids: template.assignedUserIds
      .map(id => resolveOwnerUuid(id, users))
      .filter((id): id is string => id != null),
  }
}

// ─── Read direction: joined Supabase rows -> Template ──────────────────────

type RawBillRow = {
  id: string
  master_list_id: string | null
  name: string
  name_override: string | null
  amount: number
  due_date: string
  category: string
  is_one_off: boolean
}

type RawCardRow = {
  id: string
  assigned_user_id: string | null
  income_source_id: string | null
  default_pay_amount: number
  default_pay_date: string
  default_pay_date_month_offset: number
  board_column: number | null
  header_color: string | null
  template_bills: RawBillRow[] | null
}

type RawTemplateRow = {
  id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
  template_pay_date_cards: RawCardRow[] | null
  template_assigned_users: { user_id: string }[] | null
}

/** PostgREST embedded-resource select shape for the read path. */
export const TEMPLATE_SELECT =
  '*, template_pay_date_cards(*, template_bills(*)), template_assigned_users(user_id)'

function billFromRow(row: RawBillRow): TemplateBill {
  return {
    id: row.id,
    masterListId: row.master_list_id ?? '',
    name: row.name,
    nameOverride: row.name_override ?? undefined,
    amount: row.amount,
    dueDate: row.due_date,
    category: row.category,
    isOneOff: row.is_one_off,
  }
}

function cardFromRow(row: RawCardRow, users: SupabaseUser[]): TemplatePayDateCard {
  return {
    id: row.id,
    assignedUserId: ownerFromUuid(row.assigned_user_id, users) ?? '',
    incomeSourceId: row.income_source_id ?? '',
    defaultPayAmount: row.default_pay_amount,
    defaultPayDate: row.default_pay_date,
    defaultPayDateMonthOffset: row.default_pay_date_month_offset,
    boardColumn: (row.board_column as BoardColumn | null) ?? undefined,
    headerColor: row.header_color ?? undefined,
    bills: (row.template_bills ?? []).map(billFromRow),
  }
}

export function fromRow(row: RawTemplateRow, users: SupabaseUser[]): Template {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    assignedUserIds: (row.template_assigned_users ?? [])
      .map(u => ownerFromUuid(u.user_id, users))
      .filter((id): id is string => id != null),
    payDateCards: (row.template_pay_date_cards ?? []).map(c => cardFromRow(c, users)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
