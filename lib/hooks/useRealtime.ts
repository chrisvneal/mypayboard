import { useEffect } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'

/**
 * Live household sync — subscribes to bill and note changes for the given
 * household so e.g. one partner's check-off is visible to the other without
 * a manual reload. Requires `bills` and `notes` to be added to the
 * `supabase_realtime` publication in the Supabase dashboard (Database ->
 * Replication) — RLS alone does not enable Realtime delivery, it only
 * filters which rows a subscriber is allowed to see once delivery is on.
 */
export function useRealtime(
  householdId: string | null,
  onBillChange: () => void,
  onNoteChange: () => void
) {
  const supabase = useSupabaseClient()

  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel('household-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bills',
        filter: `household_id=eq.${householdId}`
      }, () => onBillChange())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `household_id=eq.${householdId}`
      }, () => onNoteChange())
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [householdId, supabase, onBillChange, onNoteChange])
}
