const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * True for real UUIDs only. Records created before ids switched to
 * crypto.randomUUID() (see lib/format.ts) still carry old prefixed
 * non-uuid ids in a user's localStorage until they're next edited —
 * Supabase writes for those must be skipped rather than attempted.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
