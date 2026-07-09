/**
 * supabase-js query builders are lazy thenables — the actual fetch only
 * fires inside `.then()` (see PostgrestBuilder.then in
 * @supabase/postgrest-js). A bare `void supa.update(...)` with no
 * `.then()`/`await` builds the request and never sends it. Every
 * fire-and-forget Supabase write must go through this helper (or otherwise
 * chain `.then()`/`await`) so the request actually fires, and so failures
 * land in the console instead of vanishing silently.
 */
export function fireSync(request: PromiseLike<{ error: unknown }>, label: string): void {
  void request.then(res => {
    if (res.error) console.warn(`MyPayBoard: Supabase sync failed (${label})`, res.error)
  })
}
