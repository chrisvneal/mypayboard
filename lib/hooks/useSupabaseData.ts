import { useMemo } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'

/**
 * Thin, mechanical household-scoped Supabase CRUD. Holds no domain knowledge
 * of any table's shape — callers (via lib/supabase/mappers/*) decide row
 * shape and whether to await or fire-and-forget.
 */
export function useSupabaseData() {
  const supabase = useSupabaseClient()

  return useMemo(
    () => ({
      list: (table: string, householdId: string) =>
        supabase.from(table).select('*').eq('household_id', householdId),
      insert: (table: string, row: Record<string, unknown>) =>
        supabase.from(table).insert(row),
      update: (table: string, id: string, changes: Record<string, unknown>) =>
        supabase.from(table).update(changes).eq('id', id),
      remove: (table: string, id: string) => supabase.from(table).delete().eq('id', id),
      removeMany: (table: string, ids: string[]) => supabase.from(table).delete().in('id', ids),
    }),
    [supabase]
  )
}
