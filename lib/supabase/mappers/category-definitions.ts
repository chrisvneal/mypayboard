import type { CategoryDefinition } from '@/lib/types'

export function toRow(category: CategoryDefinition, householdId: string): Record<string, unknown> {
  return {
    id: category.id,
    household_id: householdId,
    name: category.name,
    scope: category.scope,
    is_default: category.isDefault,
    order: category.order,
  }
}

export function fromRow(row: Record<string, unknown>): CategoryDefinition {
  return {
    id: row.id as string,
    name: row.name as string,
    scope: row.scope as CategoryDefinition['scope'],
    isDefault: row.is_default as boolean,
    order: row.order as number,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  }
}
