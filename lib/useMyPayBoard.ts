'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  MyPayBoardData,
  MonthlyBoard,
  PayDateModule,
  Bill,
  Note,
  Creditor,
  Income,
  Template,
  User,
  BoardColumn,
} from './types'
import { SEED_DATA } from './mockData'
import { payDateSortTime } from './pay-date'

const STORAGE_KEY = 'mypayboard-data'
const SESSION_USER_KEY = 'mypayboard-user'

const LEGACY_DEBT_RECORDS_KEY = 'debt' + 'Entries'

type StoredDataWithLegacyDebtRecords = MyPayBoardData & Record<string, unknown>

function sortModulesForBoard(modules: PayDateModule[]): PayDateModule[] {
  return [...modules].sort((a, z) => {
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

function isActiveCreditor(creditor: Creditor): boolean {
  return creditor.active !== false && !creditor.archived && !creditor.muted
}

function isArchivedCreditor(creditor: Creditor): boolean {
  return creditor.active === false || Boolean(creditor.archived)
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

function dueDayFromPattern(pattern?: string): Creditor['dueDay'] {
  if (!pattern) return null
  if (pattern.toUpperCase() === 'ASAP') return 'asap'
  const match = /\/(\d{1,2})$/.exec(pattern)
  if (match) return Number(match[1])
  const dayMonth = /^(\d{1,2})[-\s]+[a-zA-Z]{3,}$/.exec(pattern)
  if (dayMonth) return Number(dayMonth[1])
  return null
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
    debtDetail: creditor.debtDetail ?? (shouldSeedDebt ? seedCreditor?.debtDetail : undefined),
  }
}

function categoryDisplayName(category: string): string {
  const normalized = category.toLowerCase()
  if (normalized === 'living' || normalized === 'living expenses') return 'Living Expenses'
  if (normalized === 'subscriptions') return 'Subscriptions'
  if (normalized === 'savings') return 'Savings'
  if (normalized === 'creditors' || normalized === 'creditor' || normalized === 'credit cards') return 'Credit Cards'
  return category
}

function incomeTypeDisplayName(type: string): string {
  const normalized = type.toLowerCase()
  if (normalized === 'jobs' || normalized === 'job') return 'Jobs'
  if (normalized === 'benefits' || normalized === 'benefit') return 'Benefits'
  if (normalized === 'business') return 'Business'
  if (normalized === 'other') return 'Other'
  return type
}

function mergeCategories(...groups: Array<Array<string | undefined>>): string[] {
  const categories: string[] = []
  groups.flat().forEach(category => {
    const next = category?.trim()
    if (!next) return
    const display = categoryDisplayName(next)
    if (!categories.some(existing => existing.toLowerCase() === display.toLowerCase())) {
      categories.push(display)
    }
  })
  return categories
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
    expenseCategories: mergeCategories(
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
    return SEED_DATA
  }
}

function getSessionUserId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as { id?: string }
    return user.id ?? null
  } catch {
    return null
  }
}

function withSessionUser(data: MyPayBoardData, sessionUserId: string | null): MyPayBoardData {
  if (!sessionUserId || data.currentUserId === sessionUserId) return data
  if (!data.users.some(user => user.id === sessionUserId)) return data
  return { ...data, currentUserId: sessionUserId }
}

function saveToStorage(data: MyPayBoardData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('MyPayBoard: failed to save to localStorage', e)
  }
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dateStr.trim())
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2]) - 1
    const day = Number(iso[3])
    return new Date(y, m, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMyPayBoard() {
  const [data, setData] = useState<MyPayBoardData>(SEED_DATA)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage after mount (defer setState to avoid sync setState-in-effect lint)
  useEffect(() => {
    const stored = loadFromStorage()
    queueMicrotask(() => {
      setData(stored)
      setIsLoaded(true)
    })
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(data)
    }
  }, [data, isLoaded])

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
    update(prev => ({ ...prev, currentUserId: userId }))
  }, [update])

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

  const setActiveBoard = useCallback((boardId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b => ({
        ...b,
        status: b.id === boardId ? 'active' : b.status === 'active' ? 'preparing' : b.status,
      })),
    }))
  }, [update])

  // ─── Modules ─────────────────────────────────────────────────────────────────

  const addModule = useCallback((boardId: string, module: PayDateModule) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId ? { ...b, modules: sortModulesForBoard([...b.modules, module]) } : b
      ),
    }))
  }, [update])

  const updateModule = useCallback((boardId: string, moduleId: string, changes: Partial<PayDateModule>) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: sortModulesForBoard(
                b.modules.map(m => (m.id === moduleId ? { ...m, ...changes } : m))
              ),
            }
          : b
      ),
    }))
  }, [update])

  const removeModule = useCallback((boardId: string, moduleId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? { ...b, modules: b.modules.filter(m => m.id !== moduleId) }
          : b
      ),
    }))
  }, [update])

  // ─── Bills ───────────────────────────────────────────────────────────────────

  const addBill = useCallback((boardId: string, moduleId: string, bill: Bill) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: b.modules.map(m =>
                m.id === moduleId ? { ...m, bills: normalizeBillOrder(insertUnpaidBill(m.bills, bill)) } : m
              ),
            }
          : b
      ),
    }))
  }, [update])

  const updateBill = useCallback((boardId: string, moduleId: string, billId: string, changes: Partial<Bill>) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: b.modules.map(m =>
                m.id === moduleId
                  ? { ...m, bills: m.bills.map(bill => (bill.id === billId ? { ...bill, ...changes } : bill)) }
                  : m
              ),
            }
          : b
      ),
    }))
  }, [update])

  const removeBill = useCallback((boardId: string, moduleId: string, billId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: b.modules.map(m =>
                m.id === moduleId
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
    fromModuleId: string,
    toModuleId: string,
    billId: string,
    beforeBillId?: string
  ) => {
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      if (!board) return prev
      const fromModule = board.modules.find(m => m.id === fromModuleId)
      const bill = fromModule?.bills.find(bi => bi.id === billId)
      if (!bill) return prev

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? {
                ...b,
                modules: b.modules.map(m => {
                  if (m.id === fromModuleId) {
                    return { ...m, bills: normalizeBillOrder(m.bills.filter(bi => bi.id !== billId)) }
                  }
                  if (m.id === toModuleId) {
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

  const toggleBillPaid = useCallback((boardId: string, moduleId: string, billId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: b.modules.map(m =>
                m.id === moduleId
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

  const addNote = useCallback((boardId: string, moduleId: string, note: Note) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: b.modules.map(m =>
                m.id === moduleId ? { ...m, notes: [...m.notes, note] } : m
              ),
            }
          : b
      ),
    }))
  }, [update])

  const markNotesRead = useCallback((boardId: string, moduleId: string, currentUserId: string) => {
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      const targetModule = board?.modules.find(m => m.id === moduleId)
      const hasUnreadNotes = targetModule?.notes.some(n => n.unread && n.authorId !== currentUserId)
      if (!board || !targetModule || !hasUnreadNotes) return prev

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? {
                ...b,
                modules: b.modules.map(m =>
                  m.id === moduleId
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

  const deleteNote = useCallback((boardId: string, moduleId: string, noteId: string) => {
    update(prev => ({
      ...prev,
      boards: prev.boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              modules: b.modules.map(m =>
                m.id === moduleId ? { ...m, notes: m.notes.filter(n => n.id !== noteId) } : m
              ),
            }
          : b
      ),
    }))
  }, [update])

  const duplicateModule = useCallback((boardId: string, moduleId: string) => {
    update(prev => {
      const board = prev.boards.find(b => b.id === boardId)
      if (!board) return prev
      const source = board.modules.find(m => m.id === moduleId)
      if (!source) return prev

      const newModuleId = generateId('mod')
      const cloneBills = source.bills.map(bi => ({
        ...bi,
        id: generateId('bill'),
      }))
      const cloneNotes = source.notes.map(n => ({
        ...n,
        id: generateId('note'),
      }))
      const maxSort = Math.max(0, ...board.modules.map(m => m.sortOrder))
      const dup: PayDateModule = {
        ...source,
        id: newModuleId,
        templateModuleId: undefined,
        isFromTemplate: false,
        sortOrder: maxSort + 1,
        bills: cloneBills,
        notes: cloneNotes,
      }

      return {
        ...prev,
        boards: prev.boards.map(b =>
          b.id === boardId
            ? { ...b, modules: sortModulesForBoard([...b.modules, dup]) }
            : b
        ),
      }
    })
  }, [update])

  // ─── Creditors ───────────────────────────────────────────────────────────────

  const addCreditor = useCallback((creditor: Creditor) => {
    update(prev => ({ ...prev, creditors: [...prev.creditors, creditor] }))
  }, [update])

  const updateCreditor = useCallback((creditorId: string, changes: Partial<Creditor>) => {
    update(prev => ({
      ...prev,
      creditors: prev.creditors.map(c => (c.id === creditorId ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c)),
    }))
  }, [update])

  const removeCreditor = useCallback((creditorId: string) => {
    update(prev => ({
      ...prev,
      creditors: prev.creditors.filter(c => c.id !== creditorId),
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

  // ─── Templates ───────────────────────────────────────────────────────────────

  const addTemplate = useCallback((template: Template) => {
    update(prev => ({ ...prev, templates: [...prev.templates, template] }))
  }, [update])

  const updateTemplate = useCallback((templateId: string, changes: Partial<Template>) => {
    update(prev => ({
      ...prev,
      templates: prev.templates.map(t =>
        t.id === templateId ? { ...t, ...changes, updatedAt: new Date().toISOString() } : t
      ),
    }))
  }, [update])

  const removeTemplate = useCallback((templateId: string) => {
    update(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== templateId),
    }))
  }, [update])

  const setDefaultTemplate = useCallback((templateId: string) => {
    update(prev => ({
      ...prev,
      templates: prev.templates.map(t => ({ ...t, isDefault: t.id === templateId })),
    }))
  }, [update])

  // ─── Derived / Computed ──────────────────────────────────────────────────────

  const getModuleRemaining = useCallback((module: PayDateModule): number => {
    const spent = module.bills
      .filter(b => !b.muted)
      .reduce((sum, b) => sum + b.amount, 0)
    return (module.payAmount ?? 0) - spent
  }, [])

  const getModulePaidTotal = useCallback((module: PayDateModule): number => {
    return module.bills.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0)
  }, [])

  const getModuleUnpaidTotal = useCallback((module: PayDateModule): number => {
    return module.bills.filter(b => !b.paid && !b.muted).reduce((sum, b) => sum + b.amount, 0)
  }, [])

  const getUnreadNoteCount = useCallback((module: PayDateModule, userId: string): number => {
    return module.notes.filter(n => n.unread && n.authorId !== userId).length
  }, [])

  const getBoardTotals = useCallback((board: MonthlyBoard) => {
    const totalIncome = board.modules.reduce((sum, m) => sum + (m.payAmount ?? 0), 0)
    const totalExpenses = board.modules.reduce((sum, m) =>
      sum + m.bills.filter(b => !b.muted).reduce((s, b) => s + b.amount, 0), 0
    )
    const totalPaid = board.modules.reduce((sum, m) =>
      sum + m.bills.filter(b => b.paid).reduce((s, b) => s + b.amount, 0), 0
    )
    const billsRemaining = board.modules.reduce((sum, m) =>
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
    const trackedCreditors = data.creditors.filter(
      creditor => creditor.trackDebt === true && creditor.active !== false && !creditor.archived
    )
    const creditCards = trackedCreditors.filter(creditor => creditor.debtDetail?.type === 'revolving')
    const installments = trackedCreditors.filter(creditor => creditor.debtDetail?.type === 'installment')
    const totalDebt = trackedCreditors.reduce((sum, creditor) => sum + (creditor.debtDetail?.balanceOwed ?? 0), 0)
    const totalMinPayments = trackedCreditors.reduce(
      (sum, creditor) => sum + (creditor.debtDetail?.minMonthlyPayment ?? 0),
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
      .reduce((sum, creditor) => sum + creditor.defaultAmount, 0)
  }, [data.creditors])

  const totalMonthlyIncome = useMemo(() => {
    return data.incomes
      .filter(isActiveIncome)
      .reduce((sum, income) => sum + monthlyIncomeAmount(income), 0)
  }, [data.incomes])

  const netMonthlyPosition = totalMonthlyIncome - totalMonthlyExpenses

  const mutedExpenses = useMemo(() => {
    return data.creditors.filter(creditor => !isArchivedCreditor(creditor) && creditor.muted)
  }, [data.creditors])

  const mutedExpensesCount = mutedExpenses.length
  const mutedExpensesTotal = mutedExpenses.reduce((sum, creditor) => sum + creditor.defaultAmount, 0)

  // ─── Reset (dev helper) ──────────────────────────────────────────────────────

  const resetToSeedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    setData(SEED_DATA)
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
    setActiveBoard,

    // Modules
    addModule,
    updateModule,
    removeModule,

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

    duplicateModule,

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

    // Templates
    addTemplate,
    updateTemplate,
    removeTemplate,
    setDefaultTemplate,

    // Computed
    getModuleRemaining,
    getModulePaidTotal,
    getModuleUnpaidTotal,
    getUnreadNoteCount,
    getBoardTotals,
    getDebtTotals,
    totalMonthlyExpenses,
    totalMonthlyIncome,
    netMonthlyPosition,
    mutedExpensesCount,
    mutedExpensesTotal,

    // Utils
    resetToSeedData,
    formatCurrency,
    formatDate,
    generateId,
  }
}