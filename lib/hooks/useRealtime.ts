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

    // Tearing the channel down ourselves (below) also delivers a `CLOSED`
    // status to this callback, asynchronously, after cleanup has already
    // run — this flag tells that expected closure apart from a real one.
    let tornDown = false

    const channel = supabase
      .channel('household-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `household_id=eq.${householdId}`
      }, () => onNoteChange())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bills',
        filter: `household_id=eq.${householdId}`
      }, () => onBillChange())
      .subscribe((status, err) => {
        if (tornDown) return
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('MyPayBoard: household-sync realtime channel failed', status, err)
        } else {
          console.info('MyPayBoard: household-sync realtime channel status', status)
        }
      })

    return () => {
      tornDown = true
      void supabase.removeChannel(channel)
    }
  }, [householdId, supabase, onNoteChange, onBillChange])
}
