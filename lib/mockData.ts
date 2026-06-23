import type {
    MyPayBoardData,
    User,
    Creditor,
    Income,
    Template,
    MonthlyBoard,
    CategoryDefinition,
  } from './types'
import { createDefaultCategoryDefinitions } from './category-definitions'
  
  // ─── Users ────────────────────────────────────────────────────────────────────
  
  export const USERS: User[] = [
    {
      id: 'user-1',
      name: 'Partner 1',
      role: 'admin',
      avatarColor: '#185FA5',
      lastActive: new Date().toISOString(),
    },
    {
      id: 'user-2',
      name: 'Partner 2',
      role: 'admin',
      avatarColor: '#3A9D5D',
      lastActive: new Date().toISOString(),
    },
  ]
  
  // ─── Master List — Creditors ──────────────────────────────────────────────────

  export const EXPENSE_CATEGORY_DEFINITIONS: CategoryDefinition[] =
    createDefaultCategoryDefinitions('expense', '2026-01-01T00:00:00Z')

  export const INCOME_CATEGORY_DEFINITIONS: CategoryDefinition[] =
    createDefaultCategoryDefinitions('income', '2026-01-01T00:00:00Z')
  
  export const CREDITORS: Creditor[] = [
    // Living Expenses
    { id: 'c-01', name: 'Mortgage / Rent', category: 'living', defaultAmount: 1800.00, dueDay: 1,    dueDatePattern: '*/1',  notes: '', active: true, muted: false, archived: false, tags: ['mortgage'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true,  debtDetail: { type: 'installment', balanceOwed: 180000.00, minMonthlyPayment: 1800.00 } },
    { id: 'c-02', name: 'Electric',        category: 'living', defaultAmount: 120.00,  dueDay: 15,   dueDatePattern: '*/15', notes: '', active: true, muted: false, archived: false, tags: ['utility'],  createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: false },
    { id: 'c-03', name: 'Internet',        category: 'living', defaultAmount: 80.00,   dueDay: 18,   dueDatePattern: '*/18', notes: '', active: true, muted: false, archived: false, tags: ['internet'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: false },
    { id: 'c-04', name: 'Car Payment',     category: 'living', defaultAmount: 350.00,  dueDay: 15,   dueDatePattern: '*/15', notes: '', active: true, muted: false, archived: false, tags: ['auto'],     createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true,  debtDetail: { type: 'installment', balanceOwed: 14500.00, minMonthlyPayment: 350.00 } },
    { id: 'c-05', name: 'Phone',           category: 'living', defaultAmount: 100.00,  dueDay: 9,    dueDatePattern: '*/9',  notes: '', active: true, muted: false, archived: false, tags: ['phone'],    createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: false },
    { id: 'c-06', name: 'Gym',             category: 'living', defaultAmount: 40.00,   dueDay: null, dueDatePattern: '',     notes: '', active: true, muted: false, archived: false, tags: ['fitness'],  createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: false },
  
    // Subscriptions
    { id: 'c-07', name: 'Streaming',       category: 'subscriptions', defaultAmount: 45.00,  dueDay: 15,   dueDatePattern: '*/15', notes: '', active: true, muted: false, archived: false, tags: ['streaming'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: false },
  
    // Savings
    { id: 'c-08', name: 'Savings',         category: 'savings',       defaultAmount: 200.00, dueDay: null, dueDatePattern: '',     notes: '', active: true, muted: false, archived: false, tags: ['savings'],   createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: false },
  
    // Credit Cards
    { id: 'c-09', name: 'Credit Card 1',   category: 'creditors',     defaultAmount: 150.00, dueDay: 20,   dueDatePattern: '*/20', notes: '', active: true, muted: false, archived: false, tags: ['credit'],    createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true,  debtDetail: { type: 'revolving', balanceOwed: 2400.00, minMonthlyPayment: 50, availableCredit: 7600.00, creditLimit: 10000, apr: 22.99 } },
    { id: 'c-10', name: 'Credit Card 2',   category: 'creditors',     defaultAmount: 100.00, dueDay: 5,    dueDatePattern: '*/5',  notes: '', active: true, muted: false, archived: false, tags: ['credit'],    createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true,  debtDetail: { type: 'revolving', balanceOwed: 950.00,  minMonthlyPayment: 25, availableCredit: 4050.00, creditLimit: 5000,  apr: 19.99 } },
  ]
  
  // ─── Income Sources ───────────────────────────────────────────────────────────
  
  export const INCOMES: Income[] = [
    { id: 'inc-01', name: 'Primary Income',   group: 'jobs', type: 'Employment', owner: 'chris',  amount: 3500.00, frequency: 'biweekly', active: true, muted: false, archived: false },
    { id: 'inc-02', name: 'Secondary Income', group: 'jobs', type: 'Employment', owner: 'nicole', amount: 2200.00, frequency: 'biweekly', active: true, muted: false, archived: false },
  ]
  
  // ─── Settings templates (monthly board blueprints) ───────────────────────────

  export const mockTemplates: Template[] = [
    {
      id: 'template-1',
      name: 'Standard Month',
      isDefault: true,
      assignedUserIds: ['user-1', 'user-2'],
      payDateCards: [
        {
          id: 'tcard-1',
          assignedUserId: 'user-1',
          incomeSourceId: 'inc-01',
          defaultPayAmount: 3500,
          defaultPayDate: '6',
          bills: [
            { id: 'tbill-1', masterListId: 'c-01', name: 'Mortgage / Rent', amount: 1800.00, dueDate: 'ASAP', category: 'Living Expenses' },
            { id: 'tbill-2', masterListId: 'c-02', name: 'Electric',        amount: 120.00,  dueDate: '15',   category: 'Living Expenses' },
            { id: 'tbill-3', masterListId: 'c-08', name: 'Savings',         amount: 200.00,  dueDate: 'ASAP', category: 'Savings' },
          ],
        },
        {
          id: 'tcard-2',
          assignedUserId: 'user-2',
          incomeSourceId: 'inc-02',
          defaultPayAmount: 2200,
          defaultPayDate: '20',
          bills: [
            { id: 'tbill-4', masterListId: 'c-03', name: 'Internet',   amount: 80.00,  dueDate: '18', category: 'Living Expenses' },
            { id: 'tbill-5', masterListId: 'c-05', name: 'Phone',      amount: 100.00, dueDate: '9',  category: 'Living Expenses' },
            { id: 'tbill-6', masterListId: 'c-07', name: 'Streaming',  amount: 45.00,  dueDate: '15', category: 'Subscriptions' },
          ],
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ]

  // ─── June 2026 — Active Monthly Board ────────────────────────────────────────
  
  export const JUNE_2026_BOARD: MonthlyBoard = {
    id: 'board-jun-2026',
    month: 6,
    year: 2026,
    label: 'June 2026',
    templateId: 'template-1',
    status: 'active',
    sharedNotes: [],
    createdAt: '2026-06-01',
    updatedAt: new Date().toISOString(),
    payDateCards: [
      {
        id: 'mod-01',
        templatePayDateCardId: 'tcard-1',
        owner: 'user-1',
        source: 'Primary Income',
        payDate: '2026-06-06',
        payAmount: 3500.00,
        boardColumn: 1,
        headerColor: '#B8D4F0',
        isFromTemplate: true,
        sortOrder: 1,
        notes: [
          { id: 'n-01', authorId: 'user-2', authorName: 'Partner 2', text: 'Can you cover the electric this check? Mine is tight.', timestamp: '2026-06-01T09:00:00' },
        ],
        bills: [
          { id: 'b-01', name: 'Mortgage / Rent', amount: 1800.00, dueDate: 'ASAP',  paid: true,  muted: false, notes: '', origin: 'master', creditorId: 'c-01' },
          { id: 'b-02', name: 'Electric',        amount: 120.00,  dueDate: '6/15',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-02' },
          { id: 'b-03', name: 'Savings',         amount: 200.00,  dueDate: 'ASAP',  paid: true,  muted: false, notes: '', origin: 'master', creditorId: 'c-08' },
        ],
      },
      {
        id: 'mod-02',
        templatePayDateCardId: 'tcard-2',
        owner: 'user-2',
        source: 'Secondary Income',
        payDate: '2026-06-13',
        payAmount: 2200.00,
        boardColumn: 1,
        headerColor: '#B8E6CA',
        isFromTemplate: true,
        sortOrder: 2,
        notes: [],
        bills: [
          { id: 'b-04', name: 'Internet',  amount: 80.00,  dueDate: '6/18', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-03' },
          { id: 'b-05', name: 'Phone',     amount: 100.00, dueDate: '6/9',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-05' },
          { id: 'b-06', name: 'Streaming', amount: 45.00,  dueDate: '6/15', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-07' },
        ],
      },
      {
        id: 'mod-03',
        templatePayDateCardId: 'tcard-1',
        owner: 'user-1',
        source: 'Primary Income',
        payDate: '2026-06-20',
        payAmount: 3500.00,
        boardColumn: 2,
        headerColor: '#B8D4F0',
        isFromTemplate: true,
        sortOrder: 3,
        notes: [],
        bills: [
          { id: 'b-07', name: 'Car Payment',   amount: 350.00, dueDate: '6/15', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-04' },
          { id: 'b-08', name: 'Gym',           amount: 40.00,  dueDate: 'ASAP', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-06' },
          { id: 'b-09', name: 'Credit Card 1', amount: 150.00, dueDate: '6/20', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-09' },
        ],
      },
      {
        id: 'mod-04',
        templatePayDateCardId: 'tcard-2',
        owner: 'user-2',
        source: 'Secondary Income',
        payDate: '2026-06-27',
        payAmount: 2200.00,
        boardColumn: 2,
        headerColor: '#B8E6CA',
        isFromTemplate: true,
        sortOrder: 4,
        notes: [
          { id: 'n-02', authorId: 'user-1', authorName: 'Partner 1', text: "Let's put extra toward Credit Card 1 this month if we can.", timestamp: '2026-06-02T14:00:00' },
        ],
        bills: [
          { id: 'b-10', name: 'Credit Card 2', amount: 100.00, dueDate: '6/5',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-10' },
        ],
      },
    ],
  }
  
  // ─── Assembled Seed Data ──────────────────────────────────────────────────────
  
  export const SEED_DATA: MyPayBoardData = {
    users: USERS,
    currentUserId: 'user-1',
    creditors: CREDITORS,
    expenseCategories: EXPENSE_CATEGORY_DEFINITIONS,
    incomeCategories: INCOME_CATEGORY_DEFINITIONS,
    incomes: INCOMES,
    boards: [JUNE_2026_BOARD],
    boardTemplates: mockTemplates,
    appVersion: '0.1.0',
  }
