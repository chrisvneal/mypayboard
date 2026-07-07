import type { Income, CategoryDefinition } from '@/lib/types'
import { resolveOwnerUuid, ownerFromUuid, type SupabaseUser } from './owner'
import { isUuid } from '../is-uuid'

export function toRow(
  income: Income,
  householdId: string,
  users: SupabaseUser[]
): Record<string, unknown> {
  return {
    id: income.id,
    household_id: householdId,
    name: income.name,
    // categoryId may still be a pre-migration non-uuid id (see lib/format.ts
    // generateId history) — only a real uuid can be sent to this FK column.
    category_id: income.categoryId && isUuid(income.categoryId) ? income.categoryId : null,
    type: income.type ?? null,
    amount: income.amount,
    frequency: income.frequency,
    owner: resolveOwnerUuid(income.owner, users),
    icon: income.icon ?? null,
    muted: income.muted,
    archived: income.archived,
    archived_at: income.archivedAt ?? null,
    active: income.active,
    updated_at: new Date().toISOString(),
  }
}

/**
 * `group` is dropped from the Supabase schema (superseded by category_id),
 * but unlike Creditor.category it's still actively read by components for
 * icon resolution and list grouping — must be reconstructed from the
 * linked category's name, not left blank.
 */
export function fromRow(
  row: Record<string, unknown>,
  users: SupabaseUser[],
  incomeCategories: CategoryDefinition[]
): Income {
  const categoryId = (row.category_id as string | null) ?? undefined
  const group = incomeCategories.find(c => c.id === categoryId)?.name ?? 'other'

  return {
    id: row.id as string,
    name: row.name as string,
    group,
    categoryId,
    type: (row.type as string | null) ?? undefined,
    amount: row.amount as number,
    frequency: row.frequency as Income['frequency'],
    owner: ownerFromUuid(row.owner as string | null, users) ?? '',
    icon: (row.icon as string | null) ?? undefined,
    muted: row.muted as boolean,
    archived: row.archived as boolean,
    archivedAt: (row.archived_at as string | null) ?? undefined,
    active: row.active as boolean,
  }
}
