import { useEffect, useRef } from 'react'
import { useRealtimeSupabaseClient } from '@/lib/supabase/client'

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
 * Reconnects on close/error with capped exponential backoff — a safety net
 * for genuine network drops/server restarts, not routine token expiry.
 * Realtime channels need a JWT with `role`/`exp` claims to stay
 * authenticated, refreshed on every heartbeat (~25s, see
 * useRealtimeSupabaseClient in lib/supabase/client.ts, which forces a fresh
 * token mint each time via `skipCache: true` rather than risking a cached
 * token with only seconds of life left — a cached, near-expiry token here
 * previously caused a connect → briefly SUBSCRIBED → expire → reconnect
 * loop every few seconds, well before this backoff logic's job even starts).
 */
export function useRealtime(
  householdId: string | null,
  onNoteChange: () => void,
  onBillChange: () => void
) {
  const supabase = useRealtimeSupabaseClient()

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
      // Scoped to this specific channel instance, not the outer effect —
      // removeChannel()'s own leave handshake re-fires this same callback
      // with another CLOSED status synchronously as it tears down, and
      // without this guard that re-entrant event would trigger another
      // removeChannel() call, which triggers another close event, forever
      // (a real stack overflow, not just a benign duplicate log).
      let closing = false
      const localChannel = supabase
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
          if (tornDown || closing) return
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Expected periodically (the underlying auth token expiring is
            // the common case) — reconnect with backoff instead of leaving
            // household sync permanently dead for the rest of the page load.
            closing = true
            console.warn(
              'MyPayBoard: household-sync realtime channel closed, reconnecting',
              status,
              err,
              `in ${reconnectDelay}ms`
            )
            void supabase.removeChannel(localChannel)
            reconnectTimer = setTimeout(() => {
              reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY_MS)
              connect()
            }, reconnectDelay)
          } else {
            if (status === 'SUBSCRIBED') reconnectDelay = RECONNECT_BASE_DELAY_MS
            console.info('MyPayBoard: household-sync realtime channel status', status)
          }
        })
      channel = localChannel
    }

    connect()

    return () => {
      tornDown = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [householdId, supabase])
}
