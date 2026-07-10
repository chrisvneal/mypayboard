import { useEffect } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'

/**
 * Live household sync — subscribes to note changes for the given household
 * so e.g. one partner's note is visible to the other without a manual
 * reload. Requires `notes` to be added to the `supabase_realtime`
 * publication in the Supabase dashboard (Database -> Replication) — RLS
 * alone does not enable Realtime delivery, it only filters which rows a
 * subscriber is allowed to see once delivery is on.
 *
 * `bills` is intentionally NOT subscribed here. Realtime fires on a
 * client's own writes too, and there's no `updated_at` column on `bills` to
 * tell "my own echo" apart from a genuinely newer edit from the other
 * window — subscribing would risk clobbering an in-progress debounced bill
 * edit (amount, paid, muted) with stale data. Notes have no in-place edit
 * (add/delete only), so onNoteChange can safely do an add-only merge
 * instead — see refetchNotes in useMyPayBoard.ts. Revisit bills once
 * either an updated_at column exists or a proper per-row merge lands.
 */
export function useRealtime(householdId: string | null, onNoteChange: () => void) {
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
      .subscribe((status, err) => {
        console.log('[DEBUG useRealtime] subscription status', status, err)
      })

    return () => { void supabase.removeChannel(channel) }
  }, [householdId, supabase, onNoteChange])
}
