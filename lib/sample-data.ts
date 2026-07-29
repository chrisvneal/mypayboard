/**
 * Phase 2 onboarding: sample creditors/income/template/board for a brand-new
 * household, so the guided tour (Phase 3) has real content instead of an
 * empty board. Only called once per household — see the claim in
 * useMyPayBoard.ts's data-load effect.
 */
import type { Bill, CategoryDefinition, Creditor, Income, PayDateCard, Template } from './types'
import { generateId } from './format'
import { createBlankTemplate } from './template-utils'
import { createBlankPreviewPayDateCard, previewPayDateCardsToTemplate } from './template-board-adapter'

const SAMPLE_URL = 'https://example.com'

function findCategoryId(categories: CategoryDefinition[], name: string): string | undefined {
  return categories.find(c => c.name === name)?.id
}

export function buildSampleCreditors(expenseCategories: CategoryDefinition[], ownerId: string): Creditor[] {
  const now = new Date().toISOString()
  const livingExpensesId = findCategoryId(expenseCategories, 'Living Expenses')
  const subscriptionsId = findCategoryId(expenseCategories, 'Subscriptions')
  const creditCardsId = findCategoryId(expenseCategories, 'Credit Cards')

  const rent: Creditor = {
    id: generateId('cred'),
    name: 'Rent',
    category: 'Living Expenses',
    categoryId: livingExpensesId,
    defaultAmount: 1200,
    dueDay: 1,
    dueDatePattern: '*/1',
    notes: '',
    muted: false,
    archived: false,
    active: true,
    tags: [],
    owner: ownerId,
    createdAt: now,
    updatedAt: now,
  }

  const utility: Creditor = {
    id: generateId('cred'),
    name: 'Acme Utilities',
    category: 'Living Expenses',
    categoryId: livingExpensesId,
    defaultAmount: 90,
    dueDay: 15,
    dueDatePattern: '*/15',
    notes: '',
    url: SAMPLE_URL,
    website: SAMPLE_URL,
    muted: false,
    archived: false,
    active: true,
    tags: [],
    owner: ownerId,
    createdAt: now,
    updatedAt: now,
  }

  const streaming: Creditor = {
    id: generateId('cred'),
    name: 'Acme Streaming',
    category: 'Subscriptions',
    categoryId: subscriptionsId,
    defaultAmount: 15,
    dueDay: 10,
    dueDatePattern: '*/10',
    notes: '',
    url: SAMPLE_URL,
    website: SAMPLE_URL,
    muted: false,
    archived: false,
    active: true,
    tags: [],
    owner: ownerId,
    createdAt: now,
    updatedAt: now,
  }

  const cardIssuer: Creditor = {
    id: generateId('cred'),
    name: 'Acme Card',
    category: 'Credit Cards',
    categoryId: creditCardsId,
    defaultAmount: 35,
    dueDay: 20,
    dueDatePattern: '*/20',
    notes: '',
    trackDebt: true,
    debtDetail: {
      type: 'revolving',
      balanceOwed: 1200,
      minMonthlyPayment: 35,
      availableCredit: 1800,
      creditLimit: 3000,
      apr: 22.99,
    },
    muted: false,
    archived: false,
    active: true,
    tags: [],
    owner: ownerId,
    createdAt: now,
    updatedAt: now,
  }

  return [rent, utility, streaming, cardIssuer]
}

export function buildSampleIncome(incomeCategories: CategoryDefinition[], ownerId: string): Income {
  return {
    id: generateId('income'),
    name: 'Sample Job',
    group: 'jobs',
    categoryId: findCategoryId(incomeCategories, 'Jobs'),
    type: 'Employment',
    amount: 2000,
    frequency: 'biweekly',
    owner: ownerId,
    muted: false,
    archived: false,
    active: true,
  }
}

/**
 * Builds a real Template by reusing the same pure functions the Template
 * Editor uses for its own "add card" / "add bill from master list" flows —
 * createBlankTemplate + createBlankPreviewPayDateCard for the shell,
 * previewPayDateCardsToTemplate for the Bill -> TemplateBill conversion
 * (due-date pattern parsing, masterListId resolution). Only the Creditor ->
 * Bill field mapping below is new — that step has no reusable export
 * anywhere in the app (it's inlined in AddBillInline's commit handler), but
 * it's a plain field copy with no due-date/category logic worth extracting.
 */
export function buildSampleTemplate(
  rentCreditor: Creditor,
  streamingCreditor: Creditor,
  income: Income,
  ownerId: string,
  month: number,
  year: number
): Template {
  const blank = createBlankTemplate('Sample Template', [ownerId])
  const card = createBlankPreviewPayDateCard(blank, month, year, [income])

  const rentBill: Bill = {
    id: generateId('bill'),
    name: rentCreditor.name,
    amount: rentCreditor.defaultAmount,
    dueDate: rentCreditor.dueDatePattern,
    category: rentCreditor.category,
    paid: false,
    muted: false,
    notes: '',
    origin: 'master',
    creditorId: rentCreditor.id,
  }

  const streamingBill: Bill = {
    id: generateId('bill'),
    name: streamingCreditor.name,
    amount: streamingCreditor.defaultAmount,
    dueDate: streamingCreditor.dueDatePattern,
    category: streamingCreditor.category,
    paid: false,
    muted: false,
    notes: '',
    origin: 'master',
    creditorId: streamingCreditor.id,
  }

  const populatedCard: PayDateCard = {
    ...card,
    owner: ownerId,
    source: income.name,
    payAmount: income.amount,
    bills: [rentBill, streamingBill],
  }

  return previewPayDateCardsToTemplate(blank, [populatedCard], month, year, [income])
}
