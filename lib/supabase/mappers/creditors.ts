import type { Creditor } from '@/lib/types'
import { resolveOwnerUuid, ownerFromUuid, type SupabaseUser } from './owner'
import { isUuid } from '../is-uuid'

export function toRow(
  creditor: Creditor,
  householdId: string,
  users: SupabaseUser[]
): Record<string, unknown> {
  const trackDebt = creditor.trackDebt ?? false
  const debtDetail = creditor.debtDetail
    ? {
        ...creditor.debtDetail,
        minMonthlyPayment: creditor.debtDetail.minMonthlyPayment ?? creditor.defaultAmount,
      }
    : null

  return {
    id: creditor.id,
    household_id: householdId,
    name: creditor.name,
    // categoryId may still be a pre-migration non-uuid id (see lib/format.ts
    // generateId history) — only a real uuid can be sent to this FK column.
    category_id: creditor.categoryId && isUuid(creditor.categoryId) ? creditor.categoryId : null,
    default_amount: creditor.defaultAmount,
    due_day: creditor.dueDay === null || creditor.dueDay === undefined ? null : String(creditor.dueDay),
    due_date_pattern: creditor.dueDatePattern ?? '',
    notes: creditor.notes ?? '',
    address: creditor.address ?? null,
    phone: creditor.phone ?? null,
    email: creditor.email ?? null,
    website: creditor.website ?? null,
    url: creditor.url ?? null,
    account_last_four: creditor.accountLastFour ?? null,
    account_last_fours: creditor.accountLastFours ?? null,
    icon: creditor.icon ?? null,
    track_debt: trackDebt,
    debt_detail: debtDetail,
    muted: creditor.muted,
    archived: creditor.archived,
    archived_at: creditor.archivedAt ?? null,
    owner: resolveOwnerUuid(creditor.owner, users),
    active: creditor.active,
    tags: creditor.tags ?? [],
    created_at: creditor.createdAt,
    updated_at: creditor.updatedAt,
  }
}

export function fromRow(row: Record<string, unknown>, users: SupabaseUser[]): Creditor {
  const dueDayRaw = row.due_day as string | null
  const dueDay: Creditor['dueDay'] =
    dueDayRaw === null
      ? null
      : dueDayRaw === 'varies' || dueDayRaw === 'asap'
        ? dueDayRaw
        : Number.isNaN(Number(dueDayRaw))
          ? null
          : Number(dueDayRaw)

  return {
    id: row.id as string,
    name: row.name as string,
    category: '', // dropped field, never read — see FIELD_MAPPING.md
    categoryId: (row.category_id as string | null) ?? undefined,
    defaultAmount: row.default_amount as number,
    dueDay,
    dueDatePattern: (row.due_date_pattern as string) ?? '',
    notes: (row.notes as string) ?? '',
    address: (row.address as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    website: (row.website as string | null) ?? undefined,
    url: (row.url as string | null) ?? undefined,
    accountLastFour: (row.account_last_four as string | null) ?? undefined,
    accountLastFours: (row.account_last_fours as string[] | null) ?? undefined,
    icon: (row.icon as string | null) ?? undefined,
    trackDebt: row.track_debt as boolean,
    debtDetail: (row.debt_detail as Creditor['debtDetail']) ?? undefined,
    muted: row.muted as boolean,
    archived: row.archived as boolean,
    archivedAt: (row.archived_at as string | null) ?? undefined,
    owner: ownerFromUuid(row.owner as string | null, users),
    active: row.active as boolean,
    tags: (row.tags as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
