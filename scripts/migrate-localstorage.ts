'use client'

// One-time migration: pushes a household's existing localStorage data
// (`mypayboard-data`) into Supabase. Runs in the browser on first
// authenticated dashboard load after this ships — see the call site in
// useMyPayBoard.ts. Gated by a per-user flag in `user_prefs.prefs`, so it
// only ever does real work once per browser/user; every call after that is
// a single cheap read that finds the flag already set and returns.
//
// By the time this runs, whatever is in `mypayboard-data` was written by
// the previous (pre–Session 4) app version, which always normalized data on
// load and re-saved it — so it's already in the current MyPayBoardData
// shape. This script does not re-run that normalization; it maps the
// stored data straight to Supabase rows using the same mappers the app's
// own mutators use (see docs/supabase/FIELD_MAPPING.md), and skips any
// record whose own id isn't a real uuid (pre–crypto.randomUUID() legacy
// data) — consistent with how every other Supabase write in this app
// already guards with isUuid().
//
// Upserts (onConflict: 'id', or 'user_id' for user_prefs) throughout, so
// re-running this against a household that already dual-wrote some records
// during the transition period just updates them in place rather than
// erroring.

import type { MyPayBoardData } from '@/lib/types'
import type { useSupabaseData } from '@/lib/hooks/useSupabaseData'
import type { SupabaseUser } from '@/lib/supabase/mappers/owner'
import { isUuid } from '@/lib/supabase/is-uuid'
import * as categoryMapper from '@/lib/supabase/mappers/category-definitions'
import * as creditorMapper from '@/lib/supabase/mappers/creditors'
import * as incomeMapper from '@/lib/supabase/mappers/incomes'
import * as templateMapper from '@/lib/supabase/mappers/templates'
import * as boardMapper from '@/lib/supabase/mappers/boards'

const STORAGE_KEY = 'mypayboard-data'
const LEGACY_PREFS_KEY_PREFIX = 'mypayboard-prefs-'
const MIGRATION_DONE_KEY_PREFIX = 'mypayboard-migration-done-'

type Supa = ReturnType<typeof useSupabaseData>

/**
 * Local-only cache of "migration already confirmed done for this household",
 * so the caller can skip the remote `user_prefs` round trip entirely on every
 * load after the first. Migration status is monotonic (once done, always
 * done), so a stale-but-true local flag is never wrong — only a false
 * negative (cache miss) is possible, which just falls back to the real check.
 */
export function hasMigrationCache(householdId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(`${MIGRATION_DONE_KEY_PREFIX}${householdId}`) === 'true'
  } catch {
    return false
  }
}

function setMigrationCache(householdId: string): void {
  try {
    localStorage.setItem(`${MIGRATION_DONE_KEY_PREFIX}${householdId}`, 'true')
  } catch {
    // Best-effort only — worst case, the next load pays the remote check again.
  }
}

export async function migrateLocalStorageToSupabase(
  supa: Supa,
  householdId: string,
  supabaseUserId: string,
  users: SupabaseUser[],
  clerkUserId: string | null
): Promise<void> {
  if (typeof window === 'undefined') return

  const { data: prefsRow } = await supa.getById('user_prefs', supabaseUserId, 'prefs')
  const existingPrefs = (prefsRow?.prefs as Record<string, unknown> | null) ?? {}
  if (existingPrefs.localStorageMigrated === true) {
    // Already migrated on an earlier load — just make sure the stale keys
    // this migration used to leave behind (before that cleanup existed)
    // are gone. Cheap no-op once they are.
    clearLegacyKeys(clerkUserId)
    setMigrationCache(householdId)
    return
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    await markMigrated(supa, supabaseUserId, householdId, existingPrefs, clerkUserId)
    return
  }

  let parsed: MyPayBoardData
  try {
    parsed = JSON.parse(raw) as MyPayBoardData
  } catch {
    console.warn('[Migration] failed to parse localStorage data — skipping this run, will retry next load')
    return
  }

  // 1. category_definitions — no dependencies.
  const categories = [...(parsed.expenseCategories ?? []), ...(parsed.incomeCategories ?? [])]
    .filter(c => isUuid(c.id))
  if (categories.length) {
    const rows = categories.map(c => categoryMapper.toRow(c, householdId))
    const { error } = await supa.upsertMany('category_definitions', rows, 'id')
    if (error) console.warn('[Migration] category_definitions upsert failed', error)
  }

  // 2. creditors — depends on categories.
  const creditors = (parsed.creditors ?? []).filter(c => isUuid(c.id))
  if (creditors.length) {
    const rows = creditors.map(c => creditorMapper.toRow(c, householdId, users))
    const { error } = await supa.upsertMany('creditors', rows, 'id')
    if (error) console.warn('[Migration] creditors upsert failed', error)
  }

  // 3. incomes — depends on categories.
  const incomes = (parsed.incomes ?? []).filter(i => isUuid(i.id))
  if (incomes.length) {
    const rows = incomes.map(i => incomeMapper.toRow(i, householdId, users))
    const { error } = await supa.upsertMany('incomes', rows, 'id')
    if (error) console.warn('[Migration] incomes upsert failed', error)
  }

  // 4. board_templates + template_pay_date_cards + template_bills — depends
  // on creditors/incomes. One RPC call per template; create_template already
  // upserts by id and handles the nested cards/bills/assigned-users as one
  // transaction (see docs/supabase/SCHEMA_DDL.sql).
  for (const template of parsed.boardTemplates ?? []) {
    if (!isUuid(template.id)) {
      console.warn(`[Migration] skipped template "${template.name}" — legacy non-uuid id, never synced`)
      continue
    }
    const args = templateMapper.toRpcArgs(template, householdId, users)
    const { error } = await supa.rpc('create_template', args)
    if (error) console.warn(`[Migration] template "${template.name}" failed`, error)
  }

  // 5. boards + pay_date_cards + bills + notes — depends on templates. One
  // RPC call per board; create_board upserts by id and handles the nested
  // cards/bills/notes as one transaction.
  for (const board of parsed.boards ?? []) {
    if (!isUuid(board.id)) {
      console.warn(`[Migration] skipped board "${board.label}" — legacy non-uuid id, never synced`)
      continue
    }
    if (!boardMapper.hasResolvableOwners(board, users)) {
      console.warn(`[Migration] skipped board "${board.label}" — one or more note authors could not be resolved`)
      continue
    }
    const args = boardMapper.toRpcArgs(board, householdId, users)
    const { error } = await supa.rpc('create_board', args)
    if (error) console.warn(`[Migration] board "${board.label}" failed`, error)
  }

  await markMigrated(supa, supabaseUserId, householdId, existingPrefs, clerkUserId)
  console.log('[Migration] localStorage → Supabase complete')
}

// Old localStorage buckets are safe to clear once Supabase has the data —
// mypayboard-user (session.ts) and the narrow mypayboard-theme-cache-{clerkId}
// (userPrefs.ts) are untouched, both still actively used, not part of this
// migration.
function clearLegacyKeys(clerkUserId: string | null): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    if (clerkUserId) localStorage.removeItem(`${LEGACY_PREFS_KEY_PREFIX}${clerkUserId}`)
  } catch {
    // Best-effort only — stale-but-unused keys left behind are harmless.
  }
}

async function markMigrated(
  supa: Supa,
  supabaseUserId: string,
  householdId: string,
  existingPrefs: Record<string, unknown>,
  clerkUserId: string | null
): Promise<void> {
  const { error } = await supa.upsert(
    'user_prefs',
    { user_id: supabaseUserId, household_id: householdId, prefs: { ...existingPrefs, localStorageMigrated: true } },
    'user_id'
  )
  if (!error) {
    clearLegacyKeys(clerkUserId)
    setMigrationCache(householdId)
  }
  if (error) console.warn('[Migration] failed to set localStorageMigrated flag — will retry next load', error)
}
