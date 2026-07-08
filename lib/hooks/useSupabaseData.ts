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
      // The `as '*'` cast preserves supabase-js's literal-select overload
      // (which every existing caller's `.data.map(fromRow)` depends on) even
      // though `select` is a plain `string` param at runtime — needed so
      // callers can also pass nested-embed clauses like
      // templateMapper.TEMPLATE_SELECT. Harmless: every mapper already treats
      // rows as hand-cast `Record<string, unknown>`, never relying on
      // Supabase's inferred column shape.
      list: (table: string, householdId: string, select = '*') =>
        supabase.from(table).select(select as '*').eq('household_id', householdId),
      insert: (table: string, row: Record<string, unknown>) =>
        supabase.from(table).insert(row),
      update: (table: string, id: string, changes: Record<string, unknown>) =>
        supabase.from(table).update(changes).eq('id', id),
      remove: (table: string, id: string) => supabase.from(table).delete().eq('id', id),
      // For pre-write FK existence checks (e.g. a note's parent pay date
      // card) — maybeSingle so "not found" resolves to null, not an error.
      exists: (table: string, id: string) => supabase.from(table).select('id').eq('id', id).maybeSingle(),
      removeMany: (table: string, ids: string[]) => supabase.from(table).delete().in('id', ids),
      rpc: (fn: string, args: Record<string, unknown>) => supabase.rpc(fn, args),
      // For tables where the natural conflict target isn't the `id` PK (e.g.
      // user_prefs, unique on user_id) — pass the column to resolve conflicts on.
      upsert: (table: string, row: Record<string, unknown>, onConflict: string) =>
        supabase.from(table).upsert(row, { onConflict }),
    }),
    [supabase]
  )
}
