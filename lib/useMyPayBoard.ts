'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  MyPayBoardData,
  PersistedMyPayBoardData,
  MonthlyBoard,
  PayDateCard,
  Bill,
  Note,
  Creditor,
  Income,
  LegacyTemplate,
  Template,
  User,
  BoardColumn,
} from './types'
import {
  categoryDisplayName,
  debtMinimumPayment,
  dueDayFromPattern,
  isActiveCreditor,
  filterMutedVisibleCreditors,
  isDebtTrackedCreditor,
  mergeExpenseCategories,
  plannedMonthlyPayment,
} from './creditors'
import { generateId } from './format'
import {
  getModulePaidTotal,
  getModuleRemaining,
  getModuleSpent,
  getModuleUnpaidTotal,
  getModuleUnreadNoteCount,
} from './module-totals'
import { buildMonthlyBoardFromTemplate } from './board-from-template'
import { SEED_DATA, mockTemplates } from './mockData'
import { createBlankTemplate, deepCloneTemplate } from './template-utils'
import { payDateSortTime } from './pay-date'
import { getSessionUserId, setSessionUser } from './session'

const STORAGE_KEY = 'mypayboard-data'
const TEMPLATES_STORAGE_KEY = 'myPayBoard_templates'

const LEGACY_DEBT_RECORDS_KEY = 'debt' + 'Entries'

type StoredDataWithLegacyDebtRecords = MyPayBoardData & Record<string, unknown>

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

function monthlyIncomeAmount(income: Income): number {
  switch (income.frequency) {
    case 'weekly':
      return income.amount * 52 / 12
    case 'biweekly':
      return income.amount * 26 / 12
    case '15th-30th':
      return income.amount * 2
    case 'monthly':
    case 'custom':
    default:
      return income.amount
  }
}

function normalizeDebtName(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeCreditor(creditor: Creditor): Creditor {
  const seedCreditor = SEED_DATA.creditors.find(seed => seed.id === creditor.id)
  const shouldSeedDebt = creditor.trackDebt === undefined && seedCreditor?.trackDebt === true
  const isNfcuCc = creditor.name.toLowerCase() === 'nfcu cc'
  const normalizedDueDay =
    isNfcuCc
      ? 4
      : creditor.dueDay ?? dueDayFromPattern(creditor.dueDatePattern)
  const rawDebtDetail = creditor.debtDetail ?? (shouldSeedDebt ? seedCreditor?.debtDetail : undefined)
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
    trackDebt: shouldSeedDebt ? true : creditor.trackDebt,
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

function mergeIncomeTypes(...groups: Array<Array<string | undefined>>): string[] {
  const types: string[] = []
  groups.flat().forEach(type => {
    const next = type?.trim()
    if (!next) return
    const display = incomeTypeDisplayName(next)
    if (!types.some(existing => existing.toLowerCase() === display.toLowerCase())) {
      types.push(display)
    }
  })
  return types
}

function normalizeIncomeOwner(owner: string | undefined): Income['owner'] {
  if (owner === 'user-chris' || owner === 'chris') return 'chris'
  if (owner === 'user-nicole' || owner === 'nicole') return 'nicole'
  return 'shared'
}

function normalizeIncome(income: Income): Income {
  const rawOwner = String((income as Income & { owner?: string }).owner ?? '')
  const fallbackGroup = income.name.toLowerCase().includes('va') ? 'benefits' : 'jobs'
  return {
    ...income,
    group: income.group ?? fallbackGroup,
    type: income.type ?? (fallbackGroup === 'benefits' ? 'Benefit' : 'Employment'),
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
  const { modules: _legacy, ...rest } = board as MonthlyBoard & { modules?: PayDateCard[] }
  const payDateCards = (board.payDateCards ?? legacyModules ?? []).map(normalizePayDateCard)
  return { ...rest, payDateCards }
}

function normalizeData(data: MyPayBoardData): MyPayBoardData {
  const stored = data as StoredDataWithLegacyDebtRecords
  const legacyDebtRecords = Array.isArray(stored[LEGACY_DEBT_RECORDS_KEY])
    ? stored[LEGACY_DEBT_RECORDS_KEY] as Array<{ name?: string }>
    : []
  const dataWithoutLegacyDebtRecords = { ...stored } as MyPayBoardData & Record<string, unknown>
  delete dataWithoutLegacyDebtRecords[LEGACY_DEBT_RECORDS_KEY]
  delete dataWithoutLegacyDebtRecords.debts
  const legacyDebtNames = new Set(
    legacyDebtRecords
      .map(entry => normalizeDebtName(entry.name ?? ''))
      .filter(Boolean)
  )
  let creditors = data.creditors
    .filter(creditor => {
      const name = creditor.name.trim().toLowerCase()
      const category = categoryDisplayName(String(creditor.category)).toLowerCase()
      if (category === 'living expenses' && (name === 'new expense' || name === 'comics')) return false
      return true
    })
    .map(normalizeCreditor)
  if (legacyDebtNames.size > 0) {
    const existingIds = new Set(creditors.map(creditor => creditor.id))
    const restoredSeedCreditors = SEED_DATA.creditors
      .filter(creditor => creditor.trackDebt === true)
      .filter(creditor => !existingIds.has(creditor.id))
      .filter(creditor => legacyDebtNames.has(normalizeDebtName(creditor.name)))
      .map(normalizeCreditor)
    creditors = [...creditors, ...restoredSeedCreditors]
  }
  const incomes = data.incomes
    .filter(income => !(income.name.trim().toLowerCase() === 'new income' && income.group === 'jobs'))
    .map(normalizeIncome)
  return {
    ...dataWithoutLegacyDebtRecords,
    creditors,
    expenseCategories: mergeExpenseCategories(
      ['Living Expenses', 'Subscriptions', 'Savings', 'Credit Cards', 'Miscellaneous'],
      data.expenseCategories ?? [],
      creditors.map(creditor => String(creditor.category))
    ),
    incomeTypes: mergeIncomeTypes(
      ['Jobs', 'Benefits', 'Business', 'Other'],
      data.incomeTypes ?? [],
      incomes.map(income => income.group)
    ),
    incomes,
    boards: data.boards.map(normalizeBoard),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage(): MyPayBoardData {
  if (typeof window === 'undefined') return SEED_DATA
  try {
    const sessionUserId = getSessionUserId()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return withSessionUser(SEED_DATA, sessionUserId)
    const parsed = JSON.parse(raw) as MyPayBoardData
    // Basic version check — if schema changes later we can migrate here
    if (!parsed.appVersion) return withSessionUser(SEED_DATA, sessionUserId)
    return withSessionUser(normalizeData(parsed), sessionUserId)
  } catch {
    // Corrupt/unreadable store: fall back to seed data, but still honor the active
    // session user so a parse failure doesn't silently reset who is signed in.
    return withSessionUser(SEED_DATA, getSessionUserId())
  }
}

function withSessionUser(data: MyPayBoardData, sessionUserId: string | null): MyPayBoardData {
  if (!sessionUserId || !data.users.some(user => user.id === sessionUserId)) return data
  if (data.currentUserId === sessionUserId) return data
  return { ...data, currentUserId: sessionUserId }
}

/** Strip runtime-only fields before writing shared household data to storage. */
function toPersistedData(data: MyPayBoardData): PersistedMyPayBoardData {
  const household = { ...data }
  delete (household as Partial<MyPayBoardData>).currentUserId
  return household as PersistedMyPayBoardData
}

function saveToStorage(data: MyPayBoardData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedData(data)))
  } catch (e) {
    console.error('MyPayBoard: failed to save to localStorage', e)
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

  const { payDateModules: _legacy, ...rest } = raw
  return { ...rest, payDateCards } as Template
}

function loadTemplatesFromStorage(): Template[] {
  if (typeof window === 'undefined') return mockTemplates
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (!raw) return mockTemplates
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed) || parsed.length === 0) return mockTemplates
    const normalized = parsed
      .map(normalizeTemplateFromStorage)
      .filter((t): t is Template => t != null)
    return normalized.length > 0 ? normalized : mockTemplates
  } catch {
    return mockTemplates
  }
}

function saveTemplatesToStorage(templates: Template[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  } catch (e) {
    console.error('MyPayBoard: failed to save templates to localStorage', e)
  }
}

// ─── Store (single dashboard-wide instance via MyPayBoardProvider) ───────────

export function useMyPayBoardStore() {
  const [data, setData] = useState<MyPayBoardData>(SEED_DATA)
  const [templates, setTemplates] = useState<Template[]>(mockTemplates)
  const [templateDirtyIds, setTemplateDirtyIds] = useState<Set<string>>(() => new Set())
  const [isLoaded, setIsLoaded] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  // Load from localStorage after mount (defer setState to avoid sync setState-in-effect lint)
  useEffect(() => {
    const stored = loadFromStorage()
    const storedTemplates = loadTemplatesFromStorage()
    queueMicrotask(() => {
      setData(stored)
      setTemplates(storedTemplates)
      setIsLoaded(true)
      setTemplatesLoaded(true)
    })
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(data)
    }
  }, [data, isLoaded])

  useEffect(() => {
    if (templatesLoaded) {
      saveTemplatesToStorage(templates)
    }
  }, [templates, templatesLoaded])

  // ─── Internal updater ───────────────────────────────────────────────────────

  const update = useCallback((updater: (prev: MyPayBoardData) => MyPayBoardData) => {
    setData(prev => {
      const next = updater(prev)
      if (next === prev) return prev
      return { ...next, updatedAt: new Date().toISOString() }
    })
  }, [])

  // ─── Auth ────────────────────────────────────────────────────────────────────

  const getCurrentUser = useCallback((): User | undefined => {
    return data.users.find(u => u.id === data.currentUserId)
  }, [data])

  const setCurrentUser = useCallback((userId: string) => {
    const user = data.users.find(u => u.id === userId)
    if (!user) return
    setSessionUser(user)
    setData(prev => (prev.currentUserId === userId ? prev : { ...prev, currentUserId: userId }))
  }, [data.users])

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
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId ? { ...b, ...changes, updatedAt: new Date().toISOString() } : b
      ),
    }))
  }, [update])

  const archiveBoard = useCallback((boardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId ? { ...b, status: 'archived' } : b
      ),
    }))
  }, [update])

  const deleteBoard = useCallback((boardId: string) => {
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

      return {
        ...prev,
        boards: remaining.map(b => ({
          ...b,
          status: b.id === nextActive.id ? 'active' : b.status === 'active' ? 'preparing' : b.status,
        })),
      }
    })
  }, [update])

  const setActiveBoard = useCallback((boardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b => ({
        ...b,
        status: b.id === boardId ? 'active' : b.status === 'active' ? 'preparing' : b.status,
      })),
    }))
  }, [update])

  // ─── Pay date cards ──────────────────────────────────────────────────────────

  const addPayDateCard = useCallback((boardId: string, card: PayDateCard) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId ? { ...b, payDateCards: sortPayDateCardsForBoard([...b.payDateCards, card]) } : b
      ),
    }))
  }, [update])

  const updatePayDateCard = useCallback((boardId: string, cardId: string, changes: Partial<PayDateCard>) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: sortPayDateCardsForBoard(
                b.payDateCards.map(m => (m.id === cardId ? { ...m, ...changes } : m))
              ),
            }
          : b
      ),
    }))
  }, [update])

  const removePayDateCard = useCallback((boardId: string, cardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? { ...b, payDateCards: b.payDateCards.filter(m => m.id !== cardId) }
          : b
      ),
    }))
  }, [update])

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
  }, [update])

  const updateBill = useCallback((boardId: string, cardId: string, billId: string, changes: Partial<Bill>) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              payDateCards: b.payDateCards.map(m =>
                m.id === cardId
                  ? { ...m, bills: m.bills.map(bill => (bill.id === billId ? { ...bill, ...changes } : bill)) }
                  : m
              ),
            }
          : b
      ),
    }))
  }, [update])

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
  }, [update])

  const moveBill = useCallback((
    boardId: string,
    fromCardId: string,
    toCardId: string,
    billId: string,
    beforeBillId?: string
  ) => {
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      if (!board) return prev
      const fromCard = board.payDateCards.find(m => m.id === fromCardId)
      const bill = fromCard?.bills.find(bi => bi.id === billId)
      if (!bill) return prev

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
  }, [update])

  const toggleBillPaid = useCallback((boardId: string, cardId: string, billId: string) => {
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
                        m.bills.map(bill => (bill.id === billId ? { ...bill, paid: !bill.paid } : bill))
                      ),
                    }
                  : m
              ),
            }
          : b
      ),
    }))
  }, [update])

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
  }, [update])

  const markNotesRead = useCallback((boardId: string, cardId: string, currentUserId: string) => {
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      const targetCard = board?.payDateCards.find(m => m.id === cardId)
      const hasUnreadNotes = targetCard?.notes.some(n => n.unread && n.authorId !== currentUserId)
      if (!board || !targetCard || !hasUnreadNotes) return prev

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? {
                ...b,
                payDateCards: b.payDateCards.map(m =>
                  m.id === cardId
                    ? {
                        ...m,
                        notes: m.notes.map(n =>
                          n.authorId !== currentUserId ? { ...n, unread: false } : n
                        ),
                      }
                    : m
                ),
              }
            : b
        ),
      }
    })
  }, [update])

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
  }, [update])

  const duplicatePayDateCard = useCallback((boardId: string, cardId: string) => {
    const newCardId = generateId('mod')
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      if (!board) return prev
      const source = board.payDateCards.find(m => m.id === cardId)
      if (!source) return prev

      const cloneBills = source.bills.map(bi => ({
        ...bi,
        id: generateId('bill'),
      }))
      const cloneNotes = source.notes.map(n => ({
        ...n,
        id: generateId('note'),
      }))
      const maxSort = Math.max(0, ...board.payDateCards.map(m => m.sortOrder))
      const dup: PayDateCard = {
        ...source,
        id: newCardId,
        templatePayDateCardId: undefined,
        isFromTemplate: false,
        sortOrder: maxSort + 1,
        bills: cloneBills,
        notes: cloneNotes,
      }

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? { ...b, payDateCards: sortPayDateCardsForBoard([...b.payDateCards, dup]) }
            : b
        ),
      }
    })
    return newCardId
  }, [update])

  // ─── Creditors ───────────────────────────────────────────────────────────────

  const addCreditor = useCallback((creditor: Creditor) => {
    update(prev => ({ ...prev, creditors: [...prev.creditors, creditor] }))
  }, [update])

  const updateCreditor = useCallback((creditorId: string, changes: Partial<Creditor>) => {
    update(prev => {
      const creditors = prev.creditors.map(c =>
        c.id === creditorId ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c
      )
      // Archiving a creditor mutes its linked module bills (reversible on unarchive);
      // see Fix Spec 2-H. Hard delete is handled in removeCreditor.
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
  }, [update])

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
  }, [update])

  const addExpenseCategory = useCallback((category: string) => {
    const nextCategory = category.trim()
    if (!nextCategory) return
    update(prev => {
      const existing = prev.expenseCategories ?? []
      if (existing.some(item => item.toLowerCase() === nextCategory.toLowerCase())) return prev
      return {
        ...prev,
        expenseCategories: [...existing, categoryDisplayName(nextCategory)],
      }
    })
  }, [update])

  const addIncomeType = useCallback((type: string) => {
    const nextType = type.trim()
    if (!nextType) return
    update(prev => {
      const existing = prev.incomeTypes ?? []
      const display = incomeTypeDisplayName(nextType)
      if (existing.some(item => item.toLowerCase() === display.toLowerCase())) return prev
      return {
        ...prev,
        incomeTypes: [...existing, display],
      }
    })
  }, [update])

  // ─── Income ──────────────────────────────────────────────────────────────────

  const addIncome = useCallback((income: Income) => {
    update(prev => ({ ...prev, incomes: [...prev.incomes, income] }))
  }, [update])

  const updateIncome = useCallback((incomeId: string, changes: Partial<Income>) => {
    update(prev => ({
      ...prev,
      incomes: prev.incomes.map(i => (i.id === incomeId ? { ...i, ...changes } : i)),
    }))
  }, [update])

  const removeIncome = useCallback((incomeId: string) => {
    update(prev => ({
      ...prev,
      incomes: prev.incomes.filter(i => i.id !== incomeId),
    }))
  }, [update])

  // ─── Legacy templates (data.templates — unchanged for seed compatibility) ─────

  const addLegacyTemplate = useCallback((template: LegacyTemplate) => {
    update(prev => ({ ...prev, templates: [...prev.templates, template] }))
  }, [update])

  const updateLegacyTemplate = useCallback((templateId: string, changes: Partial<LegacyTemplate>) => {
    update(prev => ({
      ...prev,
      templates: prev.templates.map(t =>
        t.id === templateId ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
      ),
    }))
  }, [update])

  const removeLegacyTemplate = useCallback((templateId: string) => {
    update(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== templateId),
    }))
  }, [update])

  const setLegacyDefaultTemplate = useCallback((templateId: string) => {
    update(prev => ({
      ...prev,
      templates: prev.templates.map(t => ({ ...t, isDefault: t.id === templateId })),
    }))
  }, [update])

  void addLegacyTemplate
  void updateLegacyTemplate
  void removeLegacyTemplate
  void setLegacyDefaultTemplate

  // ─── Board templates (settings) ──────────────────────────────────────────────

  const getTemplateById = useCallback(
    (id: string): Template | undefined => templates.find(t => t.id === id),
    [templates]
  )

  const createTemplate = useCallback(
    (name: string, sourceTemplateId?: string, setAsDefault?: boolean): Template => {
      const assignedUserIds = data.users.map(u => u.id)
      const source = sourceTemplateId ? templates.find(t => t.id === sourceTemplateId) : undefined
      const next = source
        ? deepCloneTemplate(source, name)
        : createBlankTemplate(name, assignedUserIds)
      const shouldBeDefault = templates.length === 0 || setAsDefault === true
      next.isDefault = shouldBeDefault
      setTemplates(prev => {
        const base = shouldBeDefault
          ? prev.map(template => ({ ...template, isDefault: false }))
          : prev
        return [...base, next]
      })
      return next
    },
    [data.users, templates]
  )

  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    )
    setTemplateDirtyIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const deleted = prev.find(t => t.id === id)
      const remaining = prev.filter(t => t.id !== id)
      if (remaining.length === 0) return remaining
      if (remaining.length === 1) {
        return remaining.map(t => ({ ...t, isDefault: true }))
      }
      if (deleted?.isDefault) {
        const earliest = [...remaining].sort(
          (a, z) => new Date(a.createdAt).getTime() - new Date(z.createdAt).getTime()
        )[0]
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
  }, [])

  const setDefaultTemplate = useCallback((id: string) => {
    setTemplates(prev =>
      prev.map(t => ({ ...t, isDefault: t.id === id, updatedAt: new Date().toISOString() }))
    )
  }, [])

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
      update(prev => {
        const boards: MonthlyBoard[] = prev.boards.map(b => ({
          ...b,
          status: b.status === 'active' ? 'preparing' : b.status,
        }))
        boards.push({ ...board, status: 'active' })
        return { ...prev, boards }
      })
      return board
    },
    [data.boards, data.incomes, templates, update]
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

  // ─── Reset (dev helper) ──────────────────────────────────────────────────────

  const resetToSeedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(TEMPLATES_STORAGE_KEY)
    }
    setData(SEED_DATA)
    setTemplates(mockTemplates)
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

    // Computed
    getModuleRemaining,
    getModulePaidTotal,
    getModuleUnpaidTotal,
    getUnreadNoteCount: getModuleUnreadNoteCount,
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