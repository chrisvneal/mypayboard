'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type {
  MyPayBoardData,
  PersistedMyPayBoardData,
  MonthlyBoard,
  PayDateCard,
  Bill,
  Note,
  Creditor,
  Income,
  Template,
  User,
  BoardColumn,
  CategoryDefinition,
} from './types'
import { useUsers } from './hooks/useUsers'
import { useSupabaseData } from './hooks/useSupabaseData'
import { useRealtime } from './hooks/useRealtime'
import { debounceWrite } from './supabase/debounce-write'
import { fireSync } from './supabase/fire-sync'
import { isUuid } from './supabase/is-uuid'
import * as categoryMapper from './supabase/mappers/category-definitions'
import * as creditorMapper from './supabase/mappers/creditors'
import * as incomeMapper from './supabase/mappers/incomes'
import * as templateMapper from './supabase/mappers/templates'
import * as boardMapper from './supabase/mappers/boards'
import {
  categoryDisplayName,
  debtMinimumPayment,
  dueDayFromPattern,
  isActiveCreditor,
  filterMutedVisibleCreditors,
  isDebtTrackedCreditor,
  plannedMonthlyPayment,
} from './creditors'
import { monthlyIncomeAmount } from './incomes'
import {
  assignCategoryOrders,
  ensureCategorySeeds,
  isFallbackCategory,
  migrateRecordCategoryIds,
  normalizeCategoryOrders,
  reassignItemsFromDeletedCategories,
} from './category-definitions'
import { generateId } from './format'
import {
  getModulePaidTotal,
  getModuleRemaining,
  getModuleSpent,
  getModuleUnpaidTotal,
  getModuleUnreadNoteCount,
} from './module-totals'
import { buildMonthlyBoardFromTemplate } from './board-from-template'
import { createBlankTemplate, deepCloneTemplate } from './template-utils'
import { payDateSortTime } from './pay-date'
import { markNotesAsRead, readUserPrefs } from './userPrefs'
import { resolveOwnerUuid } from './supabase/mappers/owner'
import { getSessionUserId, syncFromClerk } from './session'
import { errorMessage } from './utils'

const STORAGE_KEY = 'mypayboard-data'
/** Legacy separate templates key — migrated into `mypayboard-data.boardTemplates` on load. */
const LEGACY_TEMPLATES_STORAGE_KEY = 'myPayBoard_templates'

const EMPTY_STATE: MyPayBoardData = {
  users: [],
  currentUserId: '',
  creditors: [],
  expenseCategories: [],
  incomeCategories: [],
  incomes: [],
  boards: [],
  boardTemplates: [],
  appVersion: '0.1.0',
}

function omitKeys<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> {
  const next = { ...source }
  for (const key of keys) {
    Reflect.deleteProperty(next, key)
  }
  return next
}

function sortPayDateCardsForBoard(payDateCards: PayDateCard[]): PayDateCard[] {
  return [...payDateCards].sort((a, z) => {
    const ca = (a.boardColumn ?? 1) as BoardColumn
    const cz = (z.boardColumn ?? 1) as BoardColumn
    if (ca !== cz) return ca - cz
    const da = payDateSortTime(a.payDate, a.sortOrder)
    const dz = payDateSortTime(z.payDate, z.sortOrder)
    return da - dz
  })
}

/** Unpaid bills first (UI column order), then paid — stable for drag reorder */
function normalizeBillOrder(bills: Bill[]): Bill[] {
  const unpaid = bills.filter(x => !x.paid)
  const paid = bills.filter(x => x.paid)
  return [...unpaid, ...paid]
}

function insertUnpaidBill(bills: Bill[], bill: Bill, beforeBillId?: string): Bill[] {
  const unpaid = bills.filter(b => !b.paid)
  const paid = bills.filter(b => b.paid)
  let nextUnpaid: Bill[]
  if (!beforeBillId) {
    nextUnpaid = [...unpaid, bill]
  } else {
    const idx = unpaid.findIndex(b => b.id === beforeBillId)
    const at = idx === -1 ? unpaid.length : idx
    nextUnpaid = [...unpaid.slice(0, at), bill, ...unpaid.slice(at)]
  }
  return [...nextUnpaid, ...paid]
}

function isActiveIncome(income: Income): boolean {
  return income.active !== false && !income.archived && !income.muted
}


type LegacyDebtDetail = NonNullable<Creditor['debtDetail']> & { promoEndDate?: string }

function stripLegacyDebtDetailFields(
  detail: Creditor['debtDetail'] | LegacyDebtDetail | undefined
): Creditor['debtDetail'] | undefined {
  if (!detail) return detail
  if (!('promoEndDate' in detail)) return detail
  const rest = { ...(detail as LegacyDebtDetail) }
  delete rest.promoEndDate
  return rest
}

function normalizeCreditor(creditor: Creditor): Creditor {
  const normalizedDueDay =
    creditor.dueDay ?? dueDayFromPattern(creditor.dueDatePattern)
  const rawDebtDetail = stripLegacyDebtDetailFields(creditor.debtDetail)
  const debtDetail =
    rawDebtDetail && typeof rawDebtDetail.minMonthlyPayment !== 'number'
      ? { ...rawDebtDetail, minMonthlyPayment: creditor.defaultAmount }
      : rawDebtDetail
  return {
    ...creditor,
    dueDay: normalizedDueDay,
    dueDatePattern:
      typeof normalizedDueDay === 'number'
        ? `*/${normalizedDueDay}`
        : normalizedDueDay === 'asap'
          ? 'ASAP'
          : creditor.dueDatePattern,
    muted: Boolean(creditor.muted),
    archived: Boolean(creditor.archived),
    debtDetail,
  }
}

function incomeTypeDisplayName(type: string): string {
  const normalized = type.toLowerCase()
  if (normalized === 'jobs' || normalized === 'job') return 'Jobs'
  if (normalized === 'benefits' || normalized === 'benefit') return 'Benefits'
  if (normalized === 'business') return 'Business'
  if (normalized === 'other') return 'Other'
  return type
}

function normalizeIncomeOwner(owner: string | undefined): string {
  return owner ?? 'shared'
}

function normalizeIncome(income: Income): Income {
  const rawOwner = String((income as Income & { owner?: string }).owner ?? '')
  return {
    ...income,
    group: income.group ?? 'jobs',
    type: income.type ?? 'Employment',
    owner: normalizeIncomeOwner(rawOwner),
    muted: Boolean(income.muted),
    archived: Boolean(income.archived),
    active: income.active !== false,
  }
}

function normalizePayDateCard(card: PayDateCard & { templateModuleId?: string }): PayDateCard {
  const { templateModuleId, ...rest } = card
  return {
    ...rest,
    templatePayDateCardId: card.templatePayDateCardId ?? templateModuleId,
  }
}

function normalizeBoard(board: MonthlyBoard & { modules?: PayDateCard[] }): MonthlyBoard {
  const legacyModules = board.modules
  const rest = omitKeys(board, ['modules'] as const)
  const payDateCards = (board.payDateCards ?? legacyModules ?? []).map(normalizePayDateCard)
  return { ...rest, payDateCards }
}

function insertCategoryBeforeFallback(
  categories: CategoryDefinition[],
  next: CategoryDefinition
): CategoryDefinition[] {
  const withoutFallback = categories.filter(item => !isFallbackCategory(item))
  const fallback = categories.find(isFallbackCategory)
  return normalizeCategoryOrders([...withoutFallback, next, ...(fallback ? [fallback] : [])])
}

function normalizeData(data: MyPayBoardData): MyPayBoardData {
  const stored = data as MyPayBoardData & Record<string, unknown> & { incomeTypes?: string[] }

  const creditors = data.creditors.map(normalizeCreditor)

  const incomes = data.incomes
    .filter(income => !(income.name.trim().toLowerCase() === 'new income' && income.group === 'jobs'))
    .map(normalizeIncome)

  const { expenseCategories, incomeCategories } = ensureCategorySeeds(
    data.expenseCategories,
    data.incomeCategories ?? stored.incomeTypes,
    data.creditors[0]?.createdAt ?? new Date().toISOString()
  )

  const migratedRecords = migrateRecordCategoryIds(
    creditors,
    incomes,
    expenseCategories,
    incomeCategories
  )
  if (migratedRecords.migratedCount > 0) {
    console.log(
      `[Organize] Migrated category strings to ids on ${migratedRecords.migratedCount} records`
    )
  }

  const base = omitKeys(
    stored as MyPayBoardData & { templates?: unknown; updatedAt?: string; incomeTypes?: string[] },
    ['templates', 'boardTemplates', 'updatedAt', 'currentUserId', 'incomeTypes'] as const
  ) as MyPayBoardData

  return {
    ...base,
    currentUserId: base.users[0]?.id ?? '',
    creditors: migratedRecords.creditors,
    expenseCategories,
    incomeCategories,
    incomes: migratedRecords.incomes,
    boards: stripRuntimeBoardFields(data.boards.map(normalizeBoard)),
    boardTemplates: resolveBoardTemplates(stored),
  }
}

function normalizeTemplatesFromStorage(entries: unknown[]): Template[] {
  return entries
    .map(normalizeTemplateFromStorage)
    .filter((t): t is Template => t != null)
}

function loadLegacyTemplatesKey(): Template[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LEGACY_TEMPLATES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const normalized = normalizeTemplatesFromStorage(parsed)
    if (normalized.length === 0) return null
    localStorage.removeItem(LEGACY_TEMPLATES_STORAGE_KEY)
    return normalized
  } catch (error) {
    console.warn(
      'MyPayBoard: failed to migrate legacy templates key:',
      errorMessage(error)
    )
    return null
  }
}

function resolveBoardTemplates(stored: Record<string, unknown>): Template[] {
  const fromBlob = stored.boardTemplates
  if (Array.isArray(fromBlob) && fromBlob.length > 0) {
    const normalized = normalizeTemplatesFromStorage(fromBlob)
    if (normalized.length > 0) return normalized
  }
  const fromLegacyKey = loadLegacyTemplatesKey()
  if (fromLegacyKey) return fromLegacyKey
  return []
}

function stripRuntimeNoteFields(notes: Note[]): Note[] {
  return notes.map(note => ({
    id: note.id,
    authorId: note.authorId,
    authorName: note.authorName,
    text: note.text,
    timestamp: note.timestamp,
  }))
}

function stripRuntimeBoardFields(boards: MonthlyBoard[]): MonthlyBoard[] {
  return boards.map(board => ({
    ...board,
    payDateCards: board.payDateCards.map(card => ({
      ...card,
      notes: stripRuntimeNoteFields(card.notes),
    })),
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededEmptyState(): MyPayBoardData {
  const { expenseCategories, incomeCategories } = ensureCategorySeeds([], [], new Date().toISOString())
  return { ...EMPTY_STATE, expenseCategories, incomeCategories }
}

function loadFromStorage(): MyPayBoardData {
  if (typeof window === 'undefined') return EMPTY_STATE
  try {
    const sessionUserId = getSessionUserId()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return withSessionUser(seededEmptyState(), sessionUserId)
    const parsed = JSON.parse(raw) as MyPayBoardData
    // Basic version check — if schema changes later we can migrate here
    if (!parsed.appVersion) return withSessionUser(seededEmptyState(), sessionUserId)
    return withSessionUser(normalizeData(parsed), sessionUserId)
  } catch (error) {
    console.warn(
      'MyPayBoard: failed to load saved data, using empty state:',
      errorMessage(error)
    )
    return withSessionUser(seededEmptyState(), getSessionUserId())
  }
}

function withSessionUser(data: MyPayBoardData, sessionUserId: string | null): MyPayBoardData {
  const rest = omitKeys(data, ['currentUserId'] as const)
  const fallbackUserId = rest.users[0]?.id ?? ''
  if (!sessionUserId || !rest.users.some(user => user.id === sessionUserId)) {
    return { ...rest, currentUserId: fallbackUserId }
  }
  return { ...rest, currentUserId: sessionUserId }
}

/** Strip runtime-only fields before writing shared household data to storage. */
function toPersistedData(data: MyPayBoardData): PersistedMyPayBoardData {
  const household = omitKeys(
    data as MyPayBoardData & { updatedAt?: string; templates?: unknown },
    ['currentUserId', 'updatedAt', 'templates'] as const
  )

  return {
    ...household,
    boards: stripRuntimeBoardFields(household.boards),
  }
}

function saveToStorage(data: MyPayBoardData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedData(data)))
  } catch (error) {
    console.error('MyPayBoard: failed to save to localStorage:', errorMessage(error))
  }
}

/** Migrate legacy `payDateModules` / `tmod-*` ids from localStorage after Phase 0 rename. */
function normalizeTemplateFromStorage(entry: unknown): Template | null {
  if (!entry || typeof entry !== 'object') return null
  const raw = entry as Record<string, unknown>
  const legacyCards = raw.payDateCards ?? raw.payDateModules
  if (!Array.isArray(legacyCards)) return null

  const payDateCards = legacyCards.map(card => {
    if (!card || typeof card !== 'object') return card
    const c = card as Record<string, unknown>
    const id = typeof c.id === 'string' ? c.id.replace(/^tmod-/, 'tcard-') : c.id
    return { ...c, id }
  })

  const rest = omitKeys(raw, ['payDateModules'] as const)
  return { ...rest, payDateCards } as Template
}

// ─── Store (single dashboard-wide instance via MyPayBoardProvider) ───────────

export function useMyPayBoardStore() {
  const [data, setData] = useState<MyPayBoardData>(() => loadFromStorage())
  const [templateDirtyIds, setTemplateDirtyIds] = useState<Set<string>>(() => new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  const templates = data.boardTemplates

  // Mark as loaded after mount so the save effect can begin persisting changes
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(data)
    }
  }, [data, isLoaded])

  // ─── Supabase (dual-write transition) ───────────────────────────────────────

  const { householdId, users: supabaseUsers, clerkId: currentClerkId, loading: usersLoading } = useUsers()
  const supa = useSupabaseData()
  const appliedHouseholdRef = useRef<string | null>(null)

  // Every Supabase sync depends on householdId (and often supabaseUsers, for
  // owner/author resolution) resolving — both come from an async chain
  // (Clerk session -> Supabase users lookup) that isn't ready the instant the
  // dashboard mounts. Without this, any write attempted in that window was
  // silently dropped (guarded by `if (householdId) ...`, never retried).
  // queueSync runs its callback immediately if householdId is already ready,
  // or holds it until the flush effect below runs once it resolves. It reads
  // identity from refs (always current), not from values closed over at
  // queue time, so a write queued before resolution still sees fresh data.
  type SupabaseUserList = typeof supabaseUsers
  const householdIdRef = useRef<string | null>(null)
  const supabaseUsersRef = useRef<SupabaseUserList>(supabaseUsers)
  useEffect(() => {
    householdIdRef.current = householdId
    supabaseUsersRef.current = supabaseUsers
  }, [householdId, supabaseUsers])

  const pendingSyncRef = useRef<Array<() => void>>([])

  const queueSync = useCallback(
    (fn: (ctx: { householdId: string; users: SupabaseUserList }) => void) => {
      const run = () => {
        const hid = householdIdRef.current
        if (!hid) return
        fn({ householdId: hid, users: supabaseUsersRef.current })
      }
      if (householdIdRef.current) {
        console.log('[DEBUG queueSync] running immediately, householdId =', householdIdRef.current)
        run()
      } else {
        console.log('[DEBUG queueSync] householdId not ready, queueing (pending count will be)', pendingSyncRef.current.length + 1)
        pendingSyncRef.current.push(run)
      }
    },
    []
  )

  useEffect(() => {
    if (!householdId || pendingSyncRef.current.length === 0) return
    const queued = pendingSyncRef.current
    pendingSyncRef.current = []
    console.log(`[MyPayBoard] flushing ${queued.length} pending Supabase write(s) now that household resolved`)
    queued.forEach(fn => fn())
  }, [householdId])

  // data.users/currentUserId are local state that predates the Supabase
  // migration and were never wired to it — for any household onboarded
  // through the new Clerk->Supabase flow this stayed permanently empty,
  // silently breaking anything that resolves an owner/author against it
  // (pay date card owners, note authorship). Kept as its own effect rather
  // than folded into the household-ref-guarded fetch below: supabaseUsers
  // can resolve a tick after householdId does, and that fetch only ever
  // runs once per household, so it could otherwise capture an empty snapshot
  // permanently.
  useEffect(() => {
    if (!supabaseUsers.length) return
    ;(async () => {
      setData(prev => ({
        ...prev,
        users: supabaseUsers.map(u => ({
          id: u.clerk_id,
          name: u.name,
          role: (u.role === 'admin' || u.role === 'viewer' ? u.role : 'member') as User['role'],
          avatarColor: u.avatar_color,
          email: u.email ?? undefined,
        })),
        currentUserId: currentClerkId ?? prev.currentUserId,
      }))
    })()
  }, [supabaseUsers, currentClerkId])

  // Re-fetches just the boards tree — used for the initial load and, once
  // Realtime is wired below, for live updates from the other partner.
  const refetchBoards = useCallback(() => {
    if (!householdId) return
    ;(async () => {
      const { data: rows, error } = await supa.list('boards', householdId, boardMapper.BOARD_SELECT)
      console.log('[DEBUG refetchBoards] result', {
        householdId,
        supabaseUsersCount: supabaseUsers.length,
        rowCount: rows?.length ?? 0,
        rowIds: rows?.map(r => ({ id: r.id, label: r.label })),
        error,
      })
      if (error) {
        console.warn('[DEBUG refetchBoards] query failed, keeping existing boards in state', error)
        return
      }
      if (!rows?.length) return
      setData(prev => ({
        ...prev,
        boards: rows.map(r => {
          const board = boardMapper.fromRow(r, supabaseUsers)
          return {
            ...board,
            payDateCards: sortPayDateCardsForBoard(
              board.payDateCards.map(card => ({ ...card, bills: normalizeBillOrder(card.bills) }))
            ),
          }
        }),
      }))
    })()
  }, [householdId, supa, supabaseUsers])

  // Realtime-driven notes sync. Unlike bills (mutable, no updated_at column
  // to distinguish "my own echo" from a genuinely newer edit — see the
  // disabled Realtime note below), notes are add/delete-only with no
  // in-place edits, so an add-only merge by id is safe: re-fetch every note
  // for the household and add whichever ones the local state doesn't have
  // yet, without touching or removing anything already present. That makes
  // it immune to the self-echo overwrite problem that disabled full-board
  // Realtime refetching in the first place.
  const refetchNotes = useCallback(() => {
    if (!householdId) return
    ;(async () => {
      const { data: rows, error } = await supa.list(
        'notes',
        householdId,
        'id, pay_date_card_id, board_id, author_id, author_name, text, timestamp'
      )
      if (error || !rows?.length) return
      setData(prev => ({
        ...prev,
        boards: prev.boards.map(board => {
          const sharedNoteRows = rows.filter(r => r.board_id === board.id)
          const existingSharedIds = new Set(board.sharedNotes.map(n => n.id))
          const newSharedNotes = sharedNoteRows
            .filter(r => !existingSharedIds.has(r.id))
            .map(r => boardMapper.noteFromRow(r, supabaseUsers))

          return {
            ...board,
            payDateCards: board.payDateCards.map(card => {
              const existingIds = new Set(card.notes.map(n => n.id))
              const newNotes = rows
                .filter(r => r.pay_date_card_id === card.id && !existingIds.has(r.id))
                .map(r => boardMapper.noteFromRow(r, supabaseUsers))
              return newNotes.length ? { ...card, notes: [...card.notes, ...newNotes] } : card
            }),
            sharedNotes: newSharedNotes.length ? [...board.sharedNotes, ...newSharedNotes] : board.sharedNotes,
          }
        }),
      }))
    })()
  }, [householdId, supa, supabaseUsers])

  // Realtime-driven bills sync. Unlike notes, bills are edited in place
  // (paid, muted, amount) — an add-only merge wouldn't surface those
  // changes, so this is an upsert-by-id merge: existing bills get their
  // fields overwritten from Supabase, missing ones get added. Known,
  // accepted tradeoff: `bills` has no `updated_at` column, so there's no
  // way to detect "this is my own echo of a write I just made" vs. "this is
  // a genuinely newer edit from the other window" — a bill actively being
  // typed into (debounced, not yet landed) could theoretically be
  // overwritten by an unrelated Realtime-triggered refetch arriving mid-edit.
  // In practice the debounce (500ms) usually beats the refetch debounce
  // below, but this is not a hard guarantee. Revisit if this proves to be a
  // real-world problem (e.g. by adding updated_at + last-write-wins).
  const refetchBills = useCallback(() => {
    if (!householdId) return
    ;(async () => {
      const { data: rows, error } = await supa.list(
        'bills',
        householdId,
        'id, pay_date_card_id, creditor_id, name, name_override, amount, due_date, category, paid, muted, notes, origin, promoted_to_master, row_color'
      )
      if (error || !rows?.length) return
      setData(prev => ({
        ...prev,
        boards: prev.boards.map(board => ({
          ...board,
          payDateCards: board.payDateCards.map(card => {
            const cardRows = rows.filter(r => r.pay_date_card_id === card.id)
            if (!cardRows.length) return card
            const byId = new Map(card.bills.map(b => [b.id, b]))
            for (const row of cardRows) {
              byId.set(row.id, boardMapper.billFromRow(row))
            }
            return { ...card, bills: normalizeBillOrder(Array.from(byId.values())) }
          }),
        })),
      }))
    })()
  }, [householdId, supa])

  // Prefer Supabase data once the household resolves; falls back to
  // localStorage per-table if Supabase has no rows for it yet. Also waits
  // on usersLoading — householdId resolves one render before the household
  // member list finishes loading (see useUsers.ts), and every owner/author
  // lookup done here (creditors, incomes, templates, boards) needs
  // supabaseUsers to actually be populated or it silently resolves to
  // nothing. This effect only runs once per household (ref-guarded), so it
  // must wait for both to be ready rather than firing on whichever
  // resolves first.
  useEffect(() => {
    if (!householdId || usersLoading || appliedHouseholdRef.current === householdId) return
    appliedHouseholdRef.current = householdId
    ;(async () => {
      const [catRes, credRes, incRes, templateRes] = await Promise.all([
        supa.list('category_definitions', householdId),
        supa.list('creditors', householdId),
        supa.list('incomes', householdId),
        supa.list('board_templates', householdId, templateMapper.TEMPLATE_SELECT),
      ])
      setData(prev => {
        let next = prev
        let incomeCategories = prev.incomeCategories
        if (catRes.data?.length) {
          const mapped = catRes.data.map(categoryMapper.fromRow)
          const expenseCategories = mapped.filter(c => c.scope === 'expense')
          incomeCategories = mapped.filter(c => c.scope === 'income')
          next = { ...next, expenseCategories, incomeCategories }
        }
        if (credRes.data?.length) {
          next = { ...next, creditors: credRes.data.map(r => creditorMapper.fromRow(r, supabaseUsers)) }
        }
        if (incRes.data?.length) {
          next = {
            ...next,
            incomes: incRes.data.map(r => incomeMapper.fromRow(r, supabaseUsers, incomeCategories)),
          }
        }
        if (templateRes.data?.length) {
          next = {
            ...next,
            boardTemplates: templateRes.data.map(r => templateMapper.fromRow(r, supabaseUsers)),
          }
        }
        return next
      })
      // ensureCategorySeeds() (called from loadFromStorage on mount) creates
      // the household's default categories entirely locally — they never go
      // through addCategoryDefinition/addExpenseCategory, so they've never
      // reached Supabase for any household. Backfill any local category
      // that isn't in Supabase yet. Per-category (not per-scope): a scope
      // isn't "already backfilled" just because one manually-created
      // category already reached it — the seed defaults still need to land
      // independently. Uses `data` (the locally-seeded state at mount)
      // since that's what needs to end up in Supabase.
      const existingIds = new Set((catRes.data ?? []).map(r => (r as { id: string }).id))
      for (const cat of [...data.expenseCategories, ...data.incomeCategories]) {
        if (isUuid(cat.id) && !existingIds.has(cat.id)) {
          void supa.insert('category_definitions', categoryMapper.toRow(cat, householdId)).then(res => {
            console.log('[DEBUG backfillCategorySeeds] insert result', { name: cat.name, scope: cat.scope, res })
            if (res.error) console.warn('MyPayBoard: Supabase sync failed (backfillCategorySeeds)', res.error)
          })
        }
      }
    })()
    refetchBoards()
  }, [householdId, usersLoading, supa, supabaseUsers, refetchBoards])

  // Live notes + bills sync — see refetchNotes/refetchBills above for the
  // merge semantics each uses. Full board Realtime sync (cards, templates,
  // etc.) stays disabled — those still only refresh via refetchBoards() at
  // initial load.
  const debouncedRefetchNotes = useCallback(() => {
    debounceWrite('realtime:refetch-notes', refetchNotes, 300)
  }, [refetchNotes])
  const debouncedRefetchBills = useCallback(() => {
    debounceWrite('realtime:refetch-bills', refetchBills, 300)
  }, [refetchBills])
  useRealtime(householdId, debouncedRefetchNotes, debouncedRefetchBills)

  // ─── Internal updater ───────────────────────────────────────────────────────

  const update = useCallback((updater: (prev: MyPayBoardData) => MyPayBoardData) => {
    setData(prev => {
      const next = updater(prev)
      return next === prev ? prev : next
    })
  }, [])

  const updateBoardTemplates = useCallback((updater: (prev: Template[]) => Template[]) => {
    setData(prev => {
      const nextTemplates = updater(prev.boardTemplates)
      if (nextTemplates === prev.boardTemplates) return prev
      return { ...prev, boardTemplates: nextTemplates }
    })
  }, [])

  // ─── Auth ────────────────────────────────────────────────────────────────────

  const getCurrentUser = useCallback((): User | undefined => {
    return data.users.find(u => u.id === data.currentUserId)
  }, [data])

  const setCurrentUser = useCallback((userId: string) => {
    syncFromClerk(userId)
    setData(prev => (prev.currentUserId === userId ? prev : { ...prev, currentUserId: userId }))
  }, [])

  // ─── Boards ──────────────────────────────────────────────────────────────────

  const getActiveBoard = useCallback((): MonthlyBoard | undefined => {
    return data.boards.find(b => b.status === 'active')
  }, [data])

  const getBoardById = useCallback((id: string): MonthlyBoard | undefined => {
    return data.boards.find(b => b.id === id)
  }, [data])

  const addBoard = useCallback((board: MonthlyBoard) => {
    update(prev => ({
      ...prev,
      boards: [...prev.boards, board],
    }))
  }, [update])

  const updateBoard = useCallback((boardId: string, changes: Partial<MonthlyBoard>) => {
    const box: { merged: MonthlyBoard | null } = { merged: null }
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b => {
        if (b.id !== boardId) return b
        const next = { ...b, ...changes, updatedAt: new Date().toISOString() }
        box.merged = next
        return next
      }),
    }))
    if (box.merged && isUuid(boardId)) {
      const merged = box.merged
      queueSync(({ householdId }) => {
        fireSync(supa.update('boards', boardId, boardMapper.boardToRow(merged, householdId)), 'updateBoard')
      })
    }
  }, [update, supa, queueSync])

  const archiveBoard = useCallback((boardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId ? { ...b, status: 'archived' } : b
      ),
    }))
    if (isUuid(boardId)) {
      queueSync(() => {
        fireSync(supa.update('boards', boardId, { status: 'archived', updated_at: new Date().toISOString() }), 'archiveBoard')
      })
    }
  }, [update, supa, queueSync])

  const deleteBoard = useCallback((boardId: string) => {
    const box: { nextActiveId: string | null } = { nextActiveId: null }
    update(prev => {
      const remaining = prev.boards.filter(b => b.id !== boardId)
      const deletedWasActive = prev.boards.some(b => b.id === boardId && b.status === 'active')
      if (!deletedWasActive) {
        return { ...prev, boards: remaining }
      }

      const nextActive = remaining
        .filter(b => b.status !== 'archived')
        .sort((a, z) => z.year - a.year || z.month - a.month)[0]

      if (!nextActive) {
        return { ...prev, boards: remaining }
      }
      box.nextActiveId = nextActive.id

      return {
        ...prev,
        boards: remaining.map(b => ({
          ...b,
          status: b.id === nextActive.id ? 'active' : b.status === 'active' ? 'preparing' : b.status,
        })),
      }
    })
    queueSync(({ householdId }) => {
      if (isUuid(boardId)) fireSync(supa.remove('boards', boardId), 'deleteBoard')
      if (box.nextActiveId && isUuid(box.nextActiveId)) {
        fireSync(supa.update('boards', box.nextActiveId, { status: 'active', updated_at: new Date().toISOString() }), 'deleteBoard:promote')
        // Same reasoning as setActiveBoard — enforce "exactly one active
        // board" against the full Supabase household set, not local state.
        fireSync(supa.demoteOtherActiveBoards(householdId, box.nextActiveId), 'deleteBoard:demoteOthers')
      }
    })
  }, [update, supa, queueSync])

  const setActiveBoard = useCallback((boardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b => ({
        ...b,
        status: b.id === boardId ? 'active' : b.status === 'active' ? 'preparing' : b.status,
      })),
    }))
    if (isUuid(boardId)) {
      queueSync(({ householdId }) => {
        fireSync(supa.update('boards', boardId, { status: 'active', updated_at: new Date().toISOString() }), 'setActiveBoard')
        // Bulk-demote every other 'active' board in the household in
        // Supabase, not just whichever ones local state currently knows
        // about — same reasoning as createTemplate/setDefaultTemplate's
        // demoteOthers (see those comments).
        fireSync(supa.demoteOtherActiveBoards(householdId, boardId), 'setActiveBoard:demoteOthers')
      })
    }
  }, [update, supa, queueSync])

  // ─── Pay date cards ──────────────────────────────────────────────────────────

  const addPayDateCard = useCallback((boardId: string, card: PayDateCard) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId ? { ...b, payDateCards: sortPayDateCardsForBoard([...b.payDateCards, card]) } : b
      ),
    }))
    console.log('[DEBUG addPayDateCard] guard check', {
      boardId,
      cardId: card.id,
      isUuidResult: isUuid(card.id),
      cardOwner: card.owner,
    })
    if (isUuid(card.id)) {
      queueSync(({ householdId, users }) => {
        // owner is nullable (NULL = 'shared') — always insert, no owner gate.
        const row = boardMapper.cardToRow(card, boardId, householdId, users)
        console.log('[DEBUG addPayDateCard] row', row)
        void supa.insert('pay_date_cards', row).then(res => {
          console.log('[DEBUG addPayDateCard] insert result', res)
          if (res.error) {
            console.warn('MyPayBoard: Supabase sync failed (addPayDateCard)', res.error)
            return
          }
          // Bills pre-selected in the add-card form (card.bills) were being
          // dropped entirely here — only the card row was ever inserted.
          // Insert them now the card insert has confirmed success, so
          // there's no FK race against pay_date_card_id (unlike addBill,
          // which polls exists() because it can't assume its parent card's
          // insert has already resolved).
          for (const bill of card.bills) {
            if (!isUuid(bill.id)) continue
            void supa.insert('bills', boardMapper.billToRow(bill, card.id, householdId)).then(billRes => {
              console.log('[DEBUG addPayDateCard] bill insert result', { billId: bill.id, billRes })
              if (billRes.error) console.warn('MyPayBoard: Supabase sync failed (addPayDateCard:bill)', billRes.error)
            })
          }
        })
      })
    }
  }, [update, supa, queueSync])

  const updatePayDateCard = useCallback((boardId: string, cardId: string, changes: Partial<PayDateCard>) => {
    const box: { merged: PayDateCard | null } = { merged: null }
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: sortPayDateCardsForBoard(
                b.payDateCards.map(m => {
                  if (m.id !== cardId) return m
                  const next = { ...m, ...changes }
                  box.merged = next
                  return next
                })
              ),
            }
          : b
      ),
    }))
    if (box.merged && isUuid(cardId)) {
      const merged = box.merged
      queueSync(({ householdId, users }) => {
        // owner is nullable (NULL = 'shared') — always update, no owner gate.
        const row = boardMapper.cardToRow(merged, boardId, householdId, users)
        fireSync(supa.update('pay_date_cards', cardId, row), 'updatePayDateCard')
      })
    }
  }, [update, supa, queueSync])

  const removePayDateCard = useCallback((boardId: string, cardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? { ...b, payDateCards: b.payDateCards.filter(m => m.id !== cardId) }
          : b
      ),
    }))
    if (isUuid(cardId)) queueSync(() => fireSync(supa.remove('pay_date_cards', cardId), 'removePayDateCard'))
  }, [update, supa, queueSync])

  // ─── Bills ───────────────────────────────────────────────────────────────────

  const addBill = useCallback((boardId: string, cardId: string, bill: Bill) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId ? { ...m, bills: normalizeBillOrder(insertUnpaidBill(m.bills, bill)) } : m
              ),
            }
          : b
      ),
    }))
    console.log('[DEBUG addBill] guard check', {
      cardId,
      billId: bill.id,
      isUuidResult: isUuid(bill.id),
    })
    if (isUuid(bill.id)) {
      queueSync(({ householdId }) => {
        const row = boardMapper.billToRow(bill, cardId, householdId)
        console.log('[DEBUG addBill] row', row)
        if (!isUuid(cardId)) {
          console.warn(`MyPayBoard: skipped Supabase sync for bill ${bill.id} — parent card id is not a valid uuid (legacy record?)`)
          return
        }
        // Parent card may not have finished its own insert yet (e.g. a bill
        // added immediately after creating a brand-new card) — a bill insert
        // against a missing pay_date_card_id hits the FK constraint (409).
        // Same guard as addNote.
        ;(async () => {
          const { data: cardExists } = await supa.exists('pay_date_cards', cardId)
          console.log('[DEBUG addBill] parent card exists check', { cardId, cardExists })
          if (cardExists) {
            void supa.insert('bills', row).then(res => {
              console.log('[DEBUG addBill] insert result', res)
            })
          } else {
            console.warn(`MyPayBoard: skipped Supabase sync for bill ${bill.id} — parent pay date card ${cardId} not in Supabase yet`)
          }
        })()
      })
    }
  }, [update, supa, queueSync])

  // Critical path — most frequent write in the app (checking off bills, editing
  // amounts). Direct targeted update on the one bill row, never a full re-sync.
  const updateBill = useCallback((boardId: string, cardId: string, billId: string, changes: Partial<Bill>) => {
    const box: { merged: Bill | null } = { merged: null }
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId
                  ? {
                      ...m,
                      bills: m.bills.map(bill => {
                        if (bill.id !== billId) return bill
                        const next = { ...bill, ...changes }
                        box.merged = next
                        return next
                      }),
                    }
                  : m
              ),
            }
          : b
      ),
    }))
    console.log('[DEBUG updateBill] guard check', {
      hasMerged: !!box.merged,
      billId,
      isUuidResult: isUuid(billId),
    })
    if (box.merged && isUuid(billId)) {
      const merged = box.merged
      queueSync(({ householdId }) => {
        const row = boardMapper.billToRow(merged, cardId, householdId)
        console.log('[DEBUG updateBill] queueSync fired, updating', { billId, row })
        void supa.update('bills', billId, row).then(res => {
          console.log('[DEBUG updateBill] update result', res)
        })
      })
    }
  }, [update, supa, queueSync])

  const removeBill = useCallback((boardId: string, cardId: string, billId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId
                  ? { ...m, bills: m.bills.filter(bill => bill.id !== billId) }
                  : m
              ),
            }
          : b
      ),
    }))
    if (isUuid(billId)) queueSync(() => fireSync(supa.remove('bills', billId), 'removeBill'))
  }, [update, supa, queueSync])

  const moveBill = useCallback((
    boardId: string,
    fromCardId: string,
    toCardId: string,
    billId: string,
    beforeBillId?: string
  ) => {
    const box: { moved: boolean } = { moved: false }
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      if (!board) return prev
      const fromCard = board.payDateCards.find(m => m.id === fromCardId)
      const bill = fromCard?.bills.find(bi => bi.id === billId)
      if (!bill) return prev
      box.moved = true

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? {
                ...b,
                payDateCards: b.payDateCards.map(m => {
                  if (m.id === fromCardId) {
                    return { ...m, bills: normalizeBillOrder(m.bills.filter(bi => bi.id !== billId)) }
                  }
                  if (m.id === toCardId) {
                    return { ...m, bills: normalizeBillOrder(insertUnpaidBill(m.bills, bill, beforeBillId)) }
                  }
                  return m
                }),
              }
            : b
        ),
      }
    })
    if (box.moved && isUuid(billId)) {
      queueSync(() => fireSync(supa.update('bills', billId, { pay_date_card_id: toCardId }), 'moveBill'))
    }
  }, [update, supa, queueSync])

  // Critical path — most frequent write in the app. Direct targeted update on
  // the one bill row, never a full board re-sync.
  const toggleBillPaid = useCallback((boardId: string, cardId: string, billId: string) => {
    const box: { paid: boolean | null } = { paid: null }
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId
                  ? {
                      ...m,
                      bills: normalizeBillOrder(
                        m.bills.map(bill => {
                          if (bill.id !== billId) return bill
                          const paid = !bill.paid
                          box.paid = paid
                          return { ...bill, paid }
                        })
                      ),
                    }
                  : m
              ),
            }
          : b
      ),
    }))
    console.log('[DEBUG toggleBillPaid] guard check', {
      paid: box.paid,
      billId,
      isUuidResult: isUuid(billId),
    })
    if (box.paid !== null && isUuid(billId)) {
      const paid = box.paid
      queueSync(() => {
        console.log('[DEBUG toggleBillPaid] queueSync fired', { billId, paid })
        void supa.update('bills', billId, { paid }).then(res => {
          console.log('[DEBUG toggleBillPaid] update result', res)
        })
      })
    }
  }, [update, supa, queueSync])

  // ─── Notes ───────────────────────────────────────────────────────────────────

  const addNote = useCallback((boardId: string, cardId: string, note: Note) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId ? { ...m, notes: [...m.notes, note] } : m
              ),
            }
          : b
      ),
    }))
    console.log('[DEBUG addNote] guard check', { boardId, cardId, noteId: note.id, isUuidResult: isUuid(note.id), noteAuthorId: note.authorId, fallbackCurrentUserId: data.currentUserId })
    if (isUuid(note.id)) {
      const currentUserId = data.currentUserId
      queueSync(({ householdId, users }) => {
        // note.authorId can arrive blank (the UI's own "You" convention for
        // the active viewer, not a resolvable id) — data.currentUserId
        // reliably identifies who's actually using the app right now, so
        // fall back to that for the Supabase row only. The locally-saved
        // note object (and its "You" display label) are untouched.
        const effectiveAuthorId = note.authorId || currentUserId
        const row = boardMapper.noteToRow(
          { ...note, authorId: effectiveAuthorId },
          { cardId },
          householdId,
          users
        )
        console.log('[DEBUG addNote] row', row)
        if (!row.author_id) {
          console.warn(`MyPayBoard: skipped Supabase sync for note ${note.id} — author could not be resolved`)
        } else if (!isUuid(cardId)) {
          console.warn(`MyPayBoard: skipped Supabase sync for note ${note.id} — parent card id is not a valid uuid (legacy record?)`)
        } else {
          // The parent pay date card may not exist in Supabase yet (e.g. it
          // was silently skipped on its own sync for some other reason) — a
          // note insert against a missing pay_date_card_id would hit the
          // notes_pay_date_card_id_fkey constraint (409). Check first rather
          // than let that fail.
          ;(async () => {
            const { data: cardExists } = await supa.exists('pay_date_cards', cardId)
            console.log('[DEBUG addNote] parent card exists check', { cardId, cardExists })
            if (cardExists) {
              void supa.insert('notes', row).then(res => {
                console.log('[DEBUG addNote] insert result', res)
              })
            } else {
              console.warn(`MyPayBoard: skipped Supabase sync for note ${note.id} — parent pay date card ${cardId} not in Supabase yet`)
            }
          })()
        }
      })
    }
  }, [update, supa, queueSync, data.currentUserId])

  const markNotesRead = useCallback((boardId: string, cardId: string, currentUserId: string) => {
    const board = data.boards.find(b => b.id === boardId)
    const targetCard = board?.payDateCards.find(m => m.id === cardId)
    if (!targetCard) return
    const noteIds = targetCard.notes
      .filter(n => n.authorId !== currentUserId)
      .map(n => n.id)
    if (noteIds.length === 0) return
    markNotesAsRead(currentUserId, noteIds)
    // readNoteIds is part of UserPrefs but this path bypasses useUserPrefs'
    // own patch(), so it needs its own sync here to actually reach Supabase.
    queueSync(({ householdId, users }) => {
      const supabaseUserId = resolveOwnerUuid(currentUserId, users)
      if (!supabaseUserId) return
      const merged = readUserPrefs(currentUserId)
      debounceWrite(`user_prefs:${supabaseUserId}`, () => {
        fireSync(
          supa.upsert(
            'user_prefs',
            { user_id: supabaseUserId, household_id: householdId, prefs: merged },
            'user_id'
          ),
          'markNotesRead:user_prefs'
        )
      }, 500)
    })
  }, [data.boards, supa, queueSync])

  const deleteNote = useCallback((boardId: string, cardId: string, noteId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId ? { ...m, notes: m.notes.filter(n => n.id !== noteId) } : m
              ),
            }
          : b
      ),
    }))
    if (isUuid(noteId)) queueSync(() => fireSync(supa.remove('notes', noteId), 'deleteNote'))
  }, [update, supa, queueSync])

  const duplicatePayDateCard = useCallback((boardId: string, cardId: string) => {
    const newCardId = generateId('mod')
    const box: { dup: PayDateCard | null } = { dup: null }
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      if (!board) return prev
      const source = board.payDateCards.find(m => m.id === cardId)
      if (!source) return prev

      const cloneBills = source.bills.map(bi => ({
        ...bi,
        id: generateId('bill'),
      }))
      const maxSort = Math.max(0, ...board.payDateCards.map(m => m.sortOrder))
      const dup: PayDateCard = {
        ...source,
        id: newCardId,
        templatePayDateCardId: undefined,
        isFromTemplate: false,
        sortOrder: maxSort + 1,
        bills: cloneBills,
        notes: [],
      }
      box.dup = dup

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? { ...b, payDateCards: sortPayDateCardsForBoard([...b.payDateCards, dup]) }
            : b
        ),
      }
    })
    if (box.dup) {
      const dup = box.dup
      queueSync(({ householdId, users }) => {
        // owner is nullable (NULL = 'shared') — always insert, no owner gate.
        const row = boardMapper.cardToRow(dup, boardId, householdId, users)
        fireSync(supa.insert('pay_date_cards', row), 'duplicatePayDateCard')
        for (const bill of dup.bills) {
          fireSync(supa.insert('bills', boardMapper.billToRow(bill, newCardId, householdId)), 'duplicatePayDateCard:bill')
        }
      })
    }
    return newCardId
  }, [update, supa, queueSync])

  // ─── Creditors ───────────────────────────────────────────────────────────────

  const addCreditor = useCallback((creditor: Creditor) => {
    update(prev => ({ ...prev, creditors: [...prev.creditors, creditor] }))
    console.log('[DEBUG addCreditor] guard check', { creditorId: creditor.id, isUuidResult: isUuid(creditor.id), name: creditor.name })
    if (isUuid(creditor.id)) {
      queueSync(({ householdId, users }) => {
        const row = creditorMapper.toRow(creditor, householdId, users)
        console.log('[DEBUG addCreditor] row', row)
        void supa.insert('creditors', row).then(res => {
          console.log('[DEBUG addCreditor] insert result', res)
          if (res.error) console.warn('MyPayBoard: Supabase sync failed (addCreditor)', res.error)
        })
      })
    }
  }, [update, supa, queueSync])

  const updateCreditor = useCallback((creditorId: string, changes: Partial<Creditor>) => {
    const box: { merged: Creditor | null } = { merged: null }
    update(prev => {
      const creditors = prev.creditors.map(c => {
        if (c.id !== creditorId) return c
        const next = { ...c, ...changes, updatedAt: new Date().toISOString() }
        box.merged = next
        return next
      })
      // Archiving a creditor mutes its linked module bills (reversible on unarchive);
      // see Fix Spec 2-H. Hard delete is handled in removeCreditor.
      // NOTE: this cascade stays local-only for now — boards/bills aren't
      // wired to Supabase yet (deferred to a follow-up session).
      if (typeof changes.archived !== 'boolean') {
        return { ...prev, creditors }
      }
      const muted = changes.archived
      return {
        ...prev,
        creditors,
        boards: prev.boards.map(b => ({
          ...b,
          payDateCards: b.payDateCards.map(m =>
            m.bills.some(bill => bill.creditorId === creditorId)
              ? {
                  ...m,
                  bills: m.bills.map(bill =>
                    bill.creditorId === creditorId ? { ...bill, muted } : bill
                  ),
                }
              : m
          ),
        })),
      }
    })
    if (box.merged && isUuid(creditorId)) {
      const merged = box.merged
      const write = () => {
        queueSync(({ householdId, users }) => {
          fireSync(supa.update('creditors', creditorId, creditorMapper.toRow(merged, householdId, users)), 'updateCreditor')
        })
      }
      const isImmediate = 'archived' in changes || 'muted' in changes || 'active' in changes
      if (isImmediate) write()
      else debounceWrite(`creditors:${creditorId}`, write, 500)
    }
  }, [update, supa, queueSync])

  const removeCreditor = useCallback((creditorId: string) => {
    // Hard delete also removes every linked bill row from all modules (Fix Spec 2-H).
    update(prev => ({
      ...prev,
      creditors: prev.creditors.filter(c => c.id !== creditorId),
      boards: prev.boards.map(b => ({
        ...b,
        payDateCards: b.payDateCards.map(m =>
          m.bills.some(bill => bill.creditorId === creditorId)
            ? { ...m, bills: normalizeBillOrder(m.bills.filter(bill => bill.creditorId !== creditorId)) }
            : m
        ),
      })),
    }))
    if (isUuid(creditorId)) queueSync(() => fireSync(supa.remove('creditors', creditorId), 'removeCreditor'))
  }, [update, supa, queueSync])

  const addExpenseCategory = useCallback((category: string) => {
    const nextCategory = categoryDisplayName(category.trim())
    if (!nextCategory) return
    const box: { inserted: CategoryDefinition | null } = { inserted: null }
    update(prev => {
      const existing = prev.expenseCategories ?? []
      if (existing.some(item => item.name.toLowerCase() === nextCategory.toLowerCase())) return prev
      const next: CategoryDefinition = {
        id: generateId('ecat'),
        name: nextCategory,
        scope: 'expense',
        isDefault: false,
        order: existing.length,
        createdAt: new Date().toISOString(),
      }
      box.inserted = next
      return {
        ...prev,
        expenseCategories: insertCategoryBeforeFallback(existing, next),
      }
    })
    console.log('[DEBUG addExpenseCategory] guard check', { nextCategory, inserted: box.inserted })
    if (box.inserted) {
      const inserted = box.inserted
      queueSync(({ householdId }) => {
        void supa.insert('category_definitions', categoryMapper.toRow(inserted, householdId)).then(res => {
          console.log('[DEBUG addExpenseCategory] insert result', res)
          if (res.error) console.warn('MyPayBoard: Supabase sync failed (addExpenseCategory)', res.error)
        })
      })
    } else {
      console.warn(`MyPayBoard: "${nextCategory}" already exists locally (possibly a seed default) — no new category created, nothing to sync`)
    }
  }, [update, supa, queueSync])

  const addIncomeType = useCallback((type: string) => {
    const nextType = type.trim()
    if (!nextType) return
    const box: { inserted: CategoryDefinition | null } = { inserted: null }
    update(prev => {
      const existing = prev.incomeCategories ?? []
      const display = incomeTypeDisplayName(nextType)
      if (existing.some(item => item.name.toLowerCase() === display.toLowerCase())) return prev
      const next: CategoryDefinition = {
        id: generateId('icat'),
        name: display,
        scope: 'income',
        isDefault: false,
        order: existing.length,
        createdAt: new Date().toISOString(),
      }
      box.inserted = next
      return {
        ...prev,
        incomeCategories: insertCategoryBeforeFallback(existing, next),
      }
    })
    console.log('[DEBUG addIncomeType] guard check', { nextType, inserted: box.inserted })
    if (box.inserted) {
      const inserted = box.inserted
      queueSync(({ householdId }) => {
        void supa.insert('category_definitions', categoryMapper.toRow(inserted, householdId)).then(res => {
          console.log('[DEBUG addIncomeType] insert result', res)
          if (res.error) console.warn('MyPayBoard: Supabase sync failed (addIncomeType)', res.error)
        })
      })
    } else {
      console.warn(`MyPayBoard: "${nextType}" already exists locally (possibly a seed default) — no new category created, nothing to sync`)
    }
  }, [update, supa, queueSync])

  const addCategoryDefinition = useCallback((scope: CategoryDefinition['scope'], name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const box: { inserted: CategoryDefinition | null } = { inserted: null }
    update(prev => {
      const list = scope === 'expense' ? prev.expenseCategories : prev.incomeCategories
      if (list.some(item => item.name.toLowerCase() === trimmed.toLowerCase())) return prev
      const next: CategoryDefinition = {
        id: generateId(scope === 'expense' ? 'ecat' : 'icat'),
        name: trimmed,
        scope,
        isDefault: false,
        order: list.length,
        createdAt: new Date().toISOString(),
      }
      box.inserted = next
      const nextList = insertCategoryBeforeFallback(list, next)
      return scope === 'expense'
        ? { ...prev, expenseCategories: nextList }
        : { ...prev, incomeCategories: nextList }
    })
    console.log('[DEBUG addCategoryDefinition] guard check', { scope, trimmed, inserted: box.inserted })
    if (box.inserted) {
      const inserted = box.inserted
      queueSync(({ householdId }) => {
        void supa.insert('category_definitions', categoryMapper.toRow(inserted, householdId)).then(res => {
          console.log('[DEBUG addCategoryDefinition] insert result', res)
          if (res.error) console.warn('MyPayBoard: Supabase sync failed (addCategoryDefinition)', res.error)
        })
      })
    } else {
      console.warn(`MyPayBoard: "${trimmed}" already exists locally (possibly a seed default) — no new category created, nothing to sync`)
    }
  }, [update, supa, queueSync])

  const updateCategoryDefinition = useCallback(
    (categoryId: string, changes: Pick<CategoryDefinition, 'name'> | Pick<CategoryDefinition, 'order'>) => {
      const box: { updated: CategoryDefinition | null } = { updated: null }
      update(prev => {
        const patchList = (list: CategoryDefinition[]) => {
          const target = list.find(item => item.id === categoryId)
          if (!target || isFallbackCategory(target)) return list
          if ('name' in changes) {
            const trimmed = changes.name.trim()
            if (!trimmed) return list
            if (list.some(item => item.id !== categoryId && item.name.toLowerCase() === trimmed.toLowerCase())) {
              return list
            }
          }
          return list.map(item => {
            if (item.id !== categoryId) return item
            const next = { ...item, ...changes }
            box.updated = next
            return next
          })
        }

        const expenseCategories = patchList(prev.expenseCategories)
        const incomeCategories = patchList(prev.incomeCategories)
        if (expenseCategories === prev.expenseCategories && incomeCategories === prev.incomeCategories) {
          return prev
        }

        let next = prev
        if (expenseCategories !== prev.expenseCategories) {
          next = { ...next, expenseCategories }
        }
        if (incomeCategories !== prev.incomeCategories) {
          next = { ...next, incomeCategories }
        }

        if ('name' in changes) {
          const renamed =
            expenseCategories.find(item => item.id === categoryId) ??
            incomeCategories.find(item => item.id === categoryId)
          if (renamed) {
            next = {
              ...next,
              creditors: next.creditors.map(creditor =>
                creditor.categoryId === categoryId
                  ? { ...creditor, category: renamed.name as Creditor['category'] }
                  : creditor
              ),
              incomes: next.incomes.map(income =>
                income.categoryId === categoryId ? { ...income, group: renamed.name } : income
              ),
            }
          }
        }

        return next
      })
      if (box.updated) {
        const updated = box.updated
        queueSync(({ householdId }) => {
          fireSync(supa.update('category_definitions', categoryId, categoryMapper.toRow(updated, householdId)), 'updateCategoryDefinition')
        })
      }
    },
    [update, supa, queueSync]
  )

  const reorderCategoryDefinitions = useCallback(
    (scope: CategoryDefinition['scope'], orderedIds: string[]) => {
      const box: { list: CategoryDefinition[] | null } = { list: null }
      update(prev => {
        const list = scope === 'expense' ? prev.expenseCategories : prev.incomeCategories
        const scoped = list.filter(item => item.scope === scope)
        const fallback = scoped.find(isFallbackCategory)
        const reorderable = scoped.filter(item => !isFallbackCategory(item))
        const idSet = new Set(orderedIds)
        if (orderedIds.length !== reorderable.length || reorderable.some(item => !idSet.has(item.id))) {
          return prev
        }
        const byId = new Map(reorderable.map(item => [item.id, item]))
        const reordered = orderedIds
          .map(id => byId.get(id))
          .filter((item): item is CategoryDefinition => item != null)
        const nextList = assignCategoryOrders([
          ...reordered,
          ...(fallback ? [fallback] : []),
        ])
        box.list = nextList
        return scope === 'expense'
          ? { ...prev, expenseCategories: nextList }
          : { ...prev, incomeCategories: nextList }
      })
      if (box.list) {
        const list = box.list
        queueSync(() => {
          for (const item of list) {
            fireSync(supa.update('category_definitions', item.id, { order: item.order }), 'reorderCategoryDefinitions')
          }
        })
      }
    },
    [update, supa, queueSync]
  )

  const deleteCategoryDefinitions = useCallback((categoryIds: string[]) => {
    const uniqueIds = Array.from(new Set(categoryIds))
    if (uniqueIds.length === 0) return
    let deletedIds: string[] = []
    let reassignedCreditors: { id: string; categoryId?: string }[] = []
    let reassignedIncomes: { id: string; categoryId?: string }[] = []
    update(prev => {
      const deletedExpense = prev.expenseCategories.filter(
        item => uniqueIds.includes(item.id) && !isFallbackCategory(item)
      )
      const deletedIncome = prev.incomeCategories.filter(
        item => uniqueIds.includes(item.id) && !isFallbackCategory(item)
      )
      if (deletedExpense.length === 0 && deletedIncome.length === 0) return prev

      const nextExpenseCategories = normalizeCategoryOrders(
        prev.expenseCategories.filter(item => !uniqueIds.includes(item.id) || isFallbackCategory(item))
      )
      const nextIncomeCategories = normalizeCategoryOrders(
        prev.incomeCategories.filter(item => !uniqueIds.includes(item.id) || isFallbackCategory(item))
      )

      const reassigned = reassignItemsFromDeletedCategories(
        prev.creditors,
        prev.incomes,
        [...deletedExpense, ...deletedIncome],
        nextExpenseCategories,
        nextIncomeCategories
      )
      reassigned.logs.forEach(message => console.log(message))

      deletedIds = [...deletedExpense, ...deletedIncome].map(c => c.id)
      reassignedCreditors = reassigned.creditors
        .filter((c, i) => c.categoryId !== prev.creditors[i]?.categoryId)
        .map(c => ({ id: c.id, categoryId: c.categoryId }))
      reassignedIncomes = reassigned.incomes
        .filter((inc, i) => inc.categoryId !== prev.incomes[i]?.categoryId)
        .map(inc => ({ id: inc.id, categoryId: inc.categoryId }))

      return {
        ...prev,
        expenseCategories: nextExpenseCategories,
        incomeCategories: nextIncomeCategories,
        creditors: reassigned.creditors,
        incomes: reassigned.incomes,
      }
    })
    queueSync(() => {
      if (deletedIds.length) fireSync(supa.removeMany('category_definitions', deletedIds), 'deleteCategoryDefinitions')
      for (const { id, categoryId } of reassignedCreditors) {
        if (isUuid(id)) fireSync(supa.update('creditors', id, { category_id: categoryId ?? null }), 'deleteCategoryDefinitions:reassignCreditor')
      }
      for (const { id, categoryId } of reassignedIncomes) {
        if (isUuid(id)) fireSync(supa.update('incomes', id, { category_id: categoryId ?? null }), 'deleteCategoryDefinitions:reassignIncome')
      }
    })
  }, [update, supa, queueSync])

  // ─── Income ──────────────────────────────────────────────────────────────────

  const addIncome = useCallback((income: Income) => {
    update(prev => ({ ...prev, incomes: [...prev.incomes, income] }))
    if (isUuid(income.id)) {
      queueSync(({ householdId, users }) => {
        fireSync(supa.insert('incomes', incomeMapper.toRow(income, householdId, users)), 'addIncome')
      })
    }
  }, [update, supa, queueSync])

  const updateIncome = useCallback((incomeId: string, changes: Partial<Income>) => {
    const box: { merged: Income | null } = { merged: null }
    update(prev => ({
      ...prev,
      incomes: prev.incomes.map(i => {
        if (i.id !== incomeId) return i
        const next = { ...i, ...changes }
        box.merged = next
        return next
      }),
    }))
    if (box.merged && isUuid(incomeId)) {
      const merged = box.merged
      const write = () => {
        queueSync(({ householdId, users }) => {
          fireSync(supa.update('incomes', incomeId, incomeMapper.toRow(merged, householdId, users)), 'updateIncome')
        })
      }
      const isImmediate = 'archived' in changes || 'muted' in changes || 'active' in changes
      if (isImmediate) write()
      else debounceWrite(`incomes:${incomeId}`, write, 500)
    }
  }, [update, supa, queueSync])

  const removeIncome = useCallback((incomeId: string) => {
    update(prev => ({
      ...prev,
      incomes: prev.incomes.filter(i => i.id !== incomeId),
    }))
    if (isUuid(incomeId)) queueSync(() => fireSync(supa.remove('incomes', incomeId), 'removeIncome'))
  }, [update, supa, queueSync])

  // ─── Board templates (settings) ──────────────────────────────────────────────

  const getTemplateById = useCallback(
    (id: string): Template | undefined => templates.find(t => t.id === id),
    [templates]
  )

  const createTemplate = useCallback(
    (name: string, sourceTemplateId?: string, setAsDefault?: boolean): Template => {
      // data.users lags one effect hop behind Supabase (it's populated by a
      // separate useEffect watching supabaseUsers) — supabaseUsersRef is
      // updated synchronously alongside householdIdRef, so it's the freshest
      // source available at click-time. Falls back to data.users only if the
      // ref hasn't populated at all yet.
      const assignedUserIds = supabaseUsersRef.current.length
        ? supabaseUsersRef.current.map(u => u.clerk_id)
        : data.users.map(u => u.id)
      const source = sourceTemplateId ? templates.find(t => t.id === sourceTemplateId) : undefined
      const next = source
        ? deepCloneTemplate(source, name)
        : createBlankTemplate(name, assignedUserIds)
      const shouldBeDefault = templates.length === 0 || setAsDefault === true
      next.isDefault = shouldBeDefault
      updateBoardTemplates(prev => {
        const base = shouldBeDefault
          ? prev.map(template => ({ ...template, isDefault: false }))
          : prev
        return [...base, next]
      })
      console.log('[DEBUG createTemplate] guard check', { templateId: next.id, isUuidResult: isUuid(next.id), assignedUserIds, cardCount: next.payDateCards.length })
      if (isUuid(next.id)) {
        queueSync(({ householdId, users }) => {
          const args = templateMapper.toRpcArgs(next, householdId, users)
          console.log('[DEBUG createTemplate] rpc args', args)
          void supa.rpc('create_template', args).then(res => {
            console.log('[DEBUG createTemplate] rpc result', res)
          })
          // Bulk demote against the full household set in Supabase, not just
          // whatever templates local state happens to know about yet — local
          // state can be mid-hydration when this fires, and two templates
          // both ending up is_default=true is a real, observed failure mode.
          if (shouldBeDefault) {
            fireSync(supa.updateExcept('board_templates', householdId, next.id, { is_default: false }), 'createTemplate:demoteOthers')
          }
        })
      }
      return next
    },
    [data.users, templates, updateBoardTemplates, supa, queueSync]
  )

  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    const box: { merged: Template | null } = { merged: null }
    updateBoardTemplates(prev =>
      prev.map(t => {
        if (t.id !== id) return t
        const next = { ...t, ...updates, updatedAt: new Date().toISOString() }
        box.merged = next
        return next
      })
    )
    setTemplateDirtyIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    console.log('[DEBUG updateTemplate] guard check', { templateId: id, hasMerged: !!box.merged, isUuidResult: isUuid(id), cardCount: box.merged?.payDateCards.length })
    if (box.merged && isUuid(id)) {
      const merged = box.merged
      queueSync(({ householdId, users }) => {
        const args = templateMapper.toRpcArgs(merged, householdId, users)
        console.log('[DEBUG updateTemplate] rpc args', args)
        void supa.rpc('create_template', args).then(res => {
          console.log('[DEBUG updateTemplate] rpc result', res)
        })
      })
    }
  }, [updateBoardTemplates, supa, queueSync])

  const deleteTemplate = useCallback((id: string) => {
    const promotedIds: string[] = []
    updateBoardTemplates(prev => {
      const deleted = prev.find(t => t.id === id)
      const remaining = prev.filter(t => t.id !== id)
      if (remaining.length === 0) return remaining
      if (remaining.length === 1) {
        if (!remaining[0].isDefault) promotedIds.push(remaining[0].id)
        return remaining.map(t => ({ ...t, isDefault: true }))
      }
      if (deleted?.isDefault) {
        const earliest = [...remaining].sort(
          (a, z) => new Date(a.createdAt).getTime() - new Date(z.createdAt).getTime()
        )[0]
        promotedIds.push(earliest.id)
        return remaining.map(t => ({
          ...t,
          isDefault: t.id === earliest.id,
        }))
      }
      return remaining
    })
    setTemplateDirtyIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    queueSync(() => {
      if (isUuid(id)) fireSync(supa.remove('board_templates', id), 'deleteTemplate')
      for (const promotedId of promotedIds) {
        if (isUuid(promotedId)) fireSync(supa.update('board_templates', promotedId, { is_default: true }), 'deleteTemplate:promote')
      }
    })
  }, [updateBoardTemplates, supa, queueSync])

  const setDefaultTemplate = useCallback((id: string) => {
    updateBoardTemplates(prev =>
      prev.map(t => ({ ...t, isDefault: t.id === id, updatedAt: new Date().toISOString() }))
    )
    if (isUuid(id)) {
      queueSync(({ householdId }) => {
        fireSync(supa.update('board_templates', id, { is_default: true }), 'setDefaultTemplate')
        // Bulk demote every other template in the household in Supabase —
        // see createTemplate's identical comment for why this can't rely on
        // local state's idea of "which templates exist."
        fireSync(supa.updateExcept('board_templates', householdId, id, { is_default: false }), 'setDefaultTemplate:demoteOthers')
      })
    }
  }, [updateBoardTemplates, supa, queueSync])

  const refreshTemplateFromMasterList = useCallback((id: string) => {
    setTemplateDirtyIds(prev => new Set(prev).add(id))
  }, [])

  const markTemplateSaved = useCallback((id: string) => {
    setTemplateDirtyIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isTemplateDirty = useCallback(
    (id: string) => templateDirtyIds.has(id),
    [templateDirtyIds]
  )

  const createBoardFromTemplate = useCallback(
    (templateId: string, month: number, year: number): MonthlyBoard | undefined => {
      const template = templates.find(t => t.id === templateId)
      if (!template) return undefined
      const board = buildMonthlyBoardFromTemplate(template, month, year, data.incomes)
      const hasActive = data.boards.some(b => b.status === 'active')
      board.status = hasActive ? 'preparing' : 'active'
      update(prev => ({
        ...prev,
        boards: [
          ...prev.boards.map(b => ({ ...b, status: b.status === 'active' ? 'preparing' : b.status })),
          { ...board, status: 'active' },
        ],
      }))
      const stored: MonthlyBoard = { ...board, status: 'active' }
      if (isUuid(stored.id)) {
        queueSync(({ householdId, users }) => {
          console.log('[DEBUG createBoardFromTemplate] guard check', {
            boardId: stored.id,
            templateId,
            cardOwners: stored.payDateCards.map(c => ({ cardId: c.id, owner: c.owner })),
            knownUsers: users.map(u => ({ id: u.id, clerk_id: u.clerk_id, name: u.name })),
            hasResolvableOwners: boardMapper.hasResolvableOwners(stored, users),
          })
          if (boardMapper.hasResolvableOwners(stored, users)) {
            void supa.rpc('create_board', boardMapper.toRpcArgs(stored, householdId, users)).then(res => {
              console.log('[DEBUG createBoardFromTemplate] rpc result', res)
            })
            // Bulk-demote — see setActiveBoard's identical comment.
            fireSync(supa.demoteOtherActiveBoards(householdId, stored.id), 'createBoard:demoteOthers')
          } else {
            console.warn(`MyPayBoard: skipped Supabase sync for board ${stored.id} — one or more card owners could not be resolved`)
          }
        })
      }
      return board
    },
    [data.boards, data.incomes, templates, update, supa, queueSync]
  )

  const createBlankBoard = useCallback(
    (month: number, year: number): MonthlyBoard => {
      const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      const now = new Date().toISOString()
      const board: MonthlyBoard = {
        id: generateId('board'),
        month,
        year,
        label: monthLabel,
        status: 'active',
        payDateCards: [],
        sharedNotes: [],
        createdAt: now,
        updatedAt: now,
      }
      update(prev => ({
        ...prev,
        boards: [
          ...prev.boards.map(b => ({ ...b, status: b.status === 'active' ? 'preparing' : b.status })),
          board,
        ],
      }))
      if (isUuid(board.id)) {
        queueSync(({ householdId, users }) => {
          console.log('[DEBUG createBlankBoard] rpc args', boardMapper.toRpcArgs(board, householdId, users))
          void supa.rpc('create_board', boardMapper.toRpcArgs(board, householdId, users)).then(res => {
            console.log('[DEBUG createBlankBoard] rpc result', res)
          })
          // Bulk-demote — see setActiveBoard's identical comment.
          fireSync(supa.demoteOtherActiveBoards(householdId, board.id), 'createBoard:demoteOthers')
        })
      }
      return board
    },
    [update, supa, queueSync]
  )

  // ─── Derived / Computed ──────────────────────────────────────────────────────

  const getBoardTotals = useCallback((board: MonthlyBoard) => {
    const totalIncome = board.payDateCards.reduce((sum, m) => sum + (m.payAmount ?? 0), 0)
    const totalExpenses = board.payDateCards.reduce((sum, m) => sum + getModuleSpent(m), 0)
    const totalPaid = board.payDateCards.reduce((sum, m) => sum + getModulePaidTotal(m), 0)
    const billsRemaining = board.payDateCards.reduce((sum, m) =>
      sum + m.bills.filter(b => !b.paid && !b.muted).length, 0
    )
    return {
      totalIncome,
      totalExpenses,
      overage: totalIncome - totalExpenses,
      totalPaid,
      billsRemaining,
    }
  }, [])

  const getDebtTotals = useCallback(() => {
    const trackedCreditors = data.creditors.filter(isDebtTrackedCreditor)
    const creditCards = trackedCreditors.filter(creditor => creditor.debtDetail?.type === 'revolving')
    const installments = trackedCreditors.filter(creditor => creditor.debtDetail?.type === 'installment')
    const totalDebt = trackedCreditors.reduce((sum, creditor) => sum + (creditor.debtDetail?.balanceOwed ?? 0), 0)
    const totalMinPayments = trackedCreditors.reduce(
      (sum, creditor) => sum + debtMinimumPayment(creditor),
      0
    )
    const totalAvailableCredit = creditCards.reduce(
      (sum, creditor) => sum + (creditor.debtDetail?.availableCredit ?? 0),
      0
    )
    const totalCreditLimit = creditCards.reduce(
      (sum, creditor) => sum + (creditor.debtDetail?.creditLimit ?? 0),
      0
    )
    return {
      totalDebt,
      totalMinPayments,
      totalAvailableCredit,
      totalCreditLimit,
      creditCardCount: creditCards.length,
      installmentCount: installments.length,
    }
  }, [data.creditors])

  const totalMonthlyExpenses = useMemo(() => {
    return data.creditors
      .filter(isActiveCreditor)
      .reduce((sum, creditor) => sum + plannedMonthlyPayment(creditor), 0)
  }, [data.creditors])

  const totalMonthlyIncome = useMemo(() => {
    return data.incomes
      .filter(isActiveIncome)
      .reduce((sum, income) => sum + monthlyIncomeAmount(income), 0)
  }, [data.incomes])

  const netMonthlyPosition = totalMonthlyIncome - totalMonthlyExpenses

  const mutedExpenses = useMemo(
    () => filterMutedVisibleCreditors(data.creditors),
    [data.creditors]
  )

  const mutedExpensesCount = mutedExpenses.length
  const mutedExpensesTotal = mutedExpenses.reduce(
    (sum, creditor) => sum + plannedMonthlyPayment(creditor),
    0
  )

  // ─── Users ───────────────────────────────────────────────────────────────────

  const updateUser = useCallback((userId: string, changes: Partial<Pick<User, 'name' | 'email' | 'displayName'>>) => {
    update(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === userId ? { ...u, ...changes } : u),
    }))
  }, [update])

  const updateWorkspaceName = useCallback((name: string) => {
    update(prev => ({ ...prev, workspaceName: name }))
  }, [update])

  // ─── Reset (dev helper) ──────────────────────────────────────────────────────

  const resetToSeedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(LEGACY_TEMPLATES_STORAGE_KEY)
      } catch (error) {
        console.warn('MyPayBoard: failed to clear storage during reset:', errorMessage(error))
      }
    }
    setData(EMPTY_STATE)
    setTemplateDirtyIds(new Set())
  }, [])

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    // Raw data
    data,
    isLoaded,

    // Auth
    getCurrentUser,
    setCurrentUser,
    updateUser,
    updateWorkspaceName,

    // Boards
    getActiveBoard,
    getBoardById,
    addBoard,
    updateBoard,
    archiveBoard,
    deleteBoard,
    setActiveBoard,

    // Pay date cards
    addPayDateCard,
    updatePayDateCard,
    removePayDateCard,

    // Bills
    addBill,
    updateBill,
    removeBill,
    moveBill,
    toggleBillPaid,

    // Notes
    addNote,
    markNotesRead,
    deleteNote,

    duplicatePayDateCard,

    // Creditors
    addCreditor,
    updateCreditor,
    removeCreditor,
    addExpenseCategory,
    addIncomeType,
    addCategoryDefinition,
    updateCategoryDefinition,
    reorderCategoryDefinitions,
    deleteCategoryDefinitions,

    // Income
    addIncome,
    updateIncome,
    removeIncome,

    // Board templates
    templates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    refreshTemplateFromMasterList,
    markTemplateSaved,
    isTemplateDirty,
    createBoardFromTemplate,
    createBlankBoard,

    // Computed
    getModuleRemaining,
    getModulePaidTotal,
    getModuleUnpaidTotal,
    getUnreadNoteCount: (
      card: PayDateCard,
      userId: string,
      readNoteIds: ReadonlySet<string> | readonly string[]
    ) => getModuleUnreadNoteCount(card, userId, readNoteIds),
    getBoardTotals,
    getDebtTotals,
    totalMonthlyExpenses,
    totalMonthlyIncome,
    netMonthlyPosition,
    mutedExpensesCount,
    mutedExpensesTotal,

    // Utils
    resetToSeedData,
  }
}

export type MyPayBoardContextValue = ReturnType<typeof useMyPayBoardStore>

export { useMyPayBoard, MyPayBoardProvider } from './MyPayBoardProvider'
