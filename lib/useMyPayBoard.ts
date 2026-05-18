'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  MyPayBoardData,
  MonthlyBoard,
  PayDateModule,
  Bill,
  Note,
  Creditor,
  Income,
  Debt,
  Template,
  User,
  BoardColumn,
} from './types'
import { SEED_DATA } from './mockData'

const STORAGE_KEY = 'mypayboard-data'
const SESSION_USER_KEY = 'mypayboard-user'

function sortModulesForBoard(modules: PayDateModule[]): PayDateModule[] {
  return [...modules].sort((a, z) => {
    const ca = (a.boardColumn ?? 1) as BoardColumn
    const cz = (z.boardColumn ?? 1) as BoardColumn
    if (ca !== cz) return ca - cz
    const da = new Date(a.payDate).getTime() || a.sortOrder
    const dz = new Date(z.payDate).getTime() || z.sortOrder
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
    return withSessionUser(parsed, sessionUserId)
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
  const d = new Date(dateStr)
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

  // ─── Debts ───────────────────────────────────────────────────────────────────

  const addDebt = useCallback((debt: Debt) => {
    update(prev => ({ ...prev, debts: [...prev.debts, debt] }))
  }, [update])

  const updateDebt = useCallback((debtId: string, changes: Partial<Debt>) => {
    update(prev => ({
      ...prev,
      debts: prev.debts.map(d => (d.id === debtId ? { ...d, ...changes } : d)),
    }))
  }, [update])

  const removeDebt = useCallback((debtId: string) => {
    update(prev => ({
      ...prev,
      debts: prev.debts.filter(d => d.id !== debtId),
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
    const creditCards = data.debts.filter(d => d.type === 'credit_card' && d.active)
    const installments = data.debts.filter(d => d.type !== 'credit_card' && d.active)
    const totalDebt = data.debts.filter(d => d.active).reduce((sum, d) => sum + d.balance, 0)
    const totalMinPayments = data.debts.filter(d => d.active).reduce((sum, d) => sum + d.minimumPayment, 0)
    const totalAvailableCredit = creditCards.reduce((sum, d) => sum + (d.availableCredit ?? 0), 0)
    const totalCreditLimit = creditCards.reduce((sum, d) => sum + (d.creditLimit ?? 0), 0)
    return {
      totalDebt,
      totalMinPayments,
      totalAvailableCredit,
      totalCreditLimit,
      creditCardCount: creditCards.length,
      installmentCount: installments.length,
    }
  }, [data.debts])

  // Snowball strategies
  const getSnowballOrder = useCallback((strategy: 'snowball' | 'avalanche') => {
    const active = data.debts.filter(d => d.active && d.balance > 0)
    if (strategy === 'snowball') return [...active].sort((a, b) => a.balance - b.balance)
    return [...active].sort((a, b) => b.interestRate - a.interestRate)
  }, [data.debts])

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

    // Income
    addIncome,
    updateIncome,

    // Debts
    addDebt,
    updateDebt,
    removeDebt,

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
    getSnowballOrder,

    // Utils
    resetToSeedData,
    formatCurrency,
    formatDate,
    generateId,
  }
}