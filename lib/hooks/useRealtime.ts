import { useEffect, useRef } from 'react'
import { useSupabaseClient } from '@/lib/supabase/client'

const RECONNECT_BASE_DELAY_MS = 2000
const RECONNECT_MAX_DELAY_MS = 30000

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
 *
 * Reconnects on close/error with capped exponential backoff. Realtime
 * channels need a JWT with `role`/`exp` claims to stay authenticated (see
 * lib/supabase/client.ts), and Clerk's "supabase" JWT template is
 * short-lived — the channel gets closed by the server every time that token
 * ages out, which is a normal, recurring event, not a one-off failure. Without
 * a reconnect loop, household sync would silently die the first time that
 * happens on every page load.
 */
export function useRealtime(
  householdId: string | null,
  onNoteChange: () => void,
  onBillChange: () => void
) {
  const supabase = useSupabaseClient()

  // Refs so a caller passing a fresh callback identity each render can't
  // cause this effect to tear down and reconnect the channel unnecessarily.
  const onNoteChangeRef = useRef(onNoteChange)
  const onBillChangeRef = useRef(onBillChange)
  useEffect(() => {
    onNoteChangeRef.current = onNoteChange
  }, [onNoteChange])
  useEffect(() => {
    onBillChangeRef.current = onBillChange
  }, [onBillChange])

  useEffect(() => {
    if (!householdId) return

    // Tearing the channel down ourselves (below) also delivers a `CLOSED`
    // status to the subscribe callback, asynchronously, after cleanup has
    // already run — this flag tells that expected closure apart from a
    // server-initiated one that should trigger a reconnect.
    let tornDown = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelay = RECONNECT_BASE_DELAY_MS
    let channel: ReturnType<typeof supabase.channel> | null = null

    function connect() {
      channel = supabase
        .channel('household-sync')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `household_id=eq.${householdId}`
        }, () => onNoteChangeRef.current())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `household_id=eq.${householdId}`
        }, () => onBillChangeRef.current())
        .subscribe((status, err) => {
          if (tornDown) return
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Expected periodically (the underlying auth token expiring is
            // the common case) — reconnect with backoff instead of leaving
            // household sync permanently dead for the rest of the page load.
            console.warn(
              'MyPayBoard: household-sync realtime channel closed, reconnecting',
              status,
              err,
              `in ${reconnectDelay}ms`
            )
            const closedChannel = channel
            if (closedChannel) void supabase.removeChannel(closedChannel)
            reconnectTimer = setTimeout(() => {
              reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY_MS)
              connect()
            }, reconnectDelay)
          } else {
            if (status === 'SUBSCRIBED') reconnectDelay = RECONNECT_BASE_DELAY_MS
            console.info('MyPayBoard: household-sync realtime channel status', status)
          }
        })
    }

    connect()

    return () => {
      tornDown = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [householdId, supabase])
}
