import { useEffect } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'

/**
 * Live household sync — subscribes to note and bill changes for the given
 * household so e.g. one partner's note or paid-checkbox is visible to the
 * other without a manual reload. Requires `notes` and `bills` to be added
 * to the `supabase_realtime` publication in the Supabase dashboard
 * (Database -> Replication) — RLS alone does not enable Realtime delivery,
 * it only filters which rows a subscriber is allowed to see once delivery
 * is on.
 *
 * Both handlers trigger a targeted, merge-by-id refetch rather than a blind
 * full-board overwrite — see refetchNotes/refetchBills in useMyPayBoard.ts
 * for the merge semantics (and, for bills, the known tradeoff from having
 * no updated_at column to compare against).
 */
export function useRealtime(
  householdId: string | null,
  onNoteChange: () => void,
  onBillChange: () => void
) {
  const supabase = useSupabaseClient()

  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel('household-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `household_id=eq.${householdId}`
      }, payload => {
        console.log('[DEBUG useRealtime] notes change event received', payload.eventType, payload)
        onNoteChange()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bills',
        filter: `household_id=eq.${householdId}`
      }, payload => {
        console.log('[DEBUG useRealtime] bills change event received', payload.eventType, payload)
        onBillChange()
      })
      .subscribe((status, err) => {
        console.log('[DEBUG useRealtime] subscription status', status, err)
      })

    return () => { void supabase.removeChannel(channel) }
  }, [householdId, supabase, onNoteChange, onBillChange])
}
