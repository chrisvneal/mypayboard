import type {
    MyPayBoardData,
    User,
    Creditor,
    Income,
    Debt,
    Template,
    MonthlyBoard,
  } from './types'
  
  // ─── Users ────────────────────────────────────────────────────────────────────
  
  export const USERS: User[] = [
    {
      id: 'user-chris',
      name: 'Chris',
      role: 'admin',
      avatarColor: '#185FA5',
      lastActive: new Date().toISOString(),
    },
    {
      id: 'user-nicole',
      name: 'Nicole',
      role: 'admin',
      avatarColor: '#3A9D5D',
      lastActive: new Date().toISOString(),
    },
  ]
  
  // ─── Master List — Creditors ──────────────────────────────────────────────────

  export const EXPENSE_CATEGORIES = [
    'Living Expenses',
    'Subscriptions',
    'Savings',
    'Credit Cards',
    'Miscellaneous',
  ]

  export const INCOME_TYPES = ['Jobs', 'Benefits', 'Business', 'Other']
  
  export const CREDITORS: Creditor[] = [
    // Living Expenses
    { id: 'c-01', name: 'Freedom Mortgage',    category: 'living', defaultAmount: 1236.51, dueDay: 30, dueDatePattern: '*/30', notes: '1/2 split with PHH', active: true, muted: false, archived: false, tags: ['mortgage'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'installment', balanceOwed: 201425.38, minMonthlyPayment: 1236.51 } },
    { id: 'c-02', name: 'PHH Mortgage',        category: 'living', defaultAmount: 224.00,  dueDay: 30, dueDatePattern: '*/30', notes: '',                  active: true, muted: false, archived: false, tags: ['mortgage'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'installment', balanceOwed: 224, minMonthlyPayment: 224 } },
    { id: 'c-03', name: 'HOA Fee',             category: 'living', defaultAmount: 832.40,  dueDay: 30, dueDatePattern: '*/30', notes: '830.90 + fee',       active: true, muted: false, archived: false, tags: ['hoa'],      createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-04', name: 'Nelnet',              category: 'living', defaultAmount: 300.00,  dueDay: 18, dueDatePattern: '*/18', notes: '',                  active: true, muted: false, archived: false, tags: ['loan'],     createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'installment', balanceOwed: 25744.43, minMonthlyPayment: 300 } },
    { id: 'c-05', name: 'Hawaii Storage',      category: 'living', defaultAmount: 41.65,   dueDay: null, dueDatePattern: '',   notes: '',                  active: true, muted: false, archived: false, tags: [],           createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-06', name: 'Lyly School Money',   category: 'living', defaultAmount: 50.00,   dueDay: null, dueDatePattern: '',   notes: '',                  active: true, muted: false, archived: false, tags: ['family'],   createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-08', name: 'T-Mobile',            category: 'living', defaultAmount: 145.00,  dueDay: 9,  dueDatePattern: '*/9',  notes: '',                  active: true, muted: false, archived: false, tags: ['phone'],    createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-09', name: 'Buick',               category: 'living', defaultAmount: 550.00,  dueDay: 19, dueDatePattern: '*/19', notes: '',                  active: true, muted: false, archived: false, tags: ['auto'],     createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'installment', balanceOwed: 19571.92, minMonthlyPayment: 550 } },
    { id: 'c-10', name: 'Spectrum',            category: 'living', defaultAmount: 187.12,  dueDay: 18, dueDatePattern: '*/18', notes: '',                  active: true, muted: false, archived: false, tags: ['internet'], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-11', name: 'HECO Electricity',    category: 'living', defaultAmount: 230.00,  dueDay: 25, dueDatePattern: '*/25', notes: '',                  active: true, muted: false, archived: false, tags: ['utility'],  createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-12', name: 'Buick OnStar',        category: 'living', defaultAmount: 33.77,   dueDay: 10, dueDatePattern: '*/10', notes: '',                  active: true, muted: false, archived: false, tags: ['auto'],     createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-13', name: 'UFC Gym',             category: 'living', defaultAmount: 50.31,   dueDay: null, dueDatePattern: '',   notes: '',                  active: true, muted: false, archived: false, tags: ['fitness'],  createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-15', name: 'NFCU Loan',           category: 'living', defaultAmount: 1177.82, dueDay: null, dueDatePattern: '',   notes: '',                  active: true, muted: false, archived: false, tags: ['loan'],     createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  
    // Subscriptions
    { id: 'c-16', name: 'YouTube',             category: 'subscriptions', defaultAmount: 28.00, dueDay: 21, dueDatePattern: '*/21', notes: '', active: true, muted: false, archived: false, tags: ['streaming'], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-17', name: 'Wishbone Pet Health', category: 'subscriptions', defaultAmount: 25.00, dueDay: 1,  dueDatePattern: '*/1',  notes: '', active: true, muted: false, archived: false, tags: ['pet'],       createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-18', name: 'Disney+/Hulu',        category: 'subscriptions', defaultAmount: 13.60, dueDay: 17, dueDatePattern: '*/17', notes: '', active: true, muted: false, archived: false, tags: ['streaming'], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  
    // Savings
    { id: 'c-07', name: 'Lyly Savings',        category: 'savings', defaultAmount: 100.00, dueDay: 9,  dueDatePattern: '*/9', notes: '', active: true, muted: false, archived: false, tags: ['savings'],    createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-19', name: 'IRA',                 category: 'savings', defaultAmount: 100.00, dueDay: null, dueDatePattern: '',  notes: '', active: true, muted: false, archived: false, tags: ['retirement'], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-20', name: 'HYSA',                category: 'savings', defaultAmount: 175.00, dueDay: null, dueDatePattern: '',  notes: '', active: true, muted: false, archived: false, tags: ['savings'],    createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'c-14', name: 'Stock Trading Group', category: 'savings', defaultAmount: 50.00,  dueDay: 8,  dueDatePattern: '*/8', notes: '', active: true, muted: false, archived: false, tags: ['invest'],     createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  
    // Creditors
    { id: 'c-21', name: 'Cap 1 FHH',       category: 'creditors', defaultAmount: 1000.00, dueDay: 15,     dueDatePattern: '*/15', notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', accountLastFour: '6055', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 6055.32, minMonthlyPayment: 2000, availableCredit: 4294.68, creditLimit: 10350, apr: 28.24 } },
    { id: 'c-22', name: 'USAA (Chris)',    category: 'creditors', defaultAmount: 150.00,  dueDay: 20,     dueDatePattern: '*/20', notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 2732, minMonthlyPayment: 0, availableCredit: 20000, creditLimit: 14000, apr: 21.90 } },
    { id: 'c-23', name: 'Navy Fed Visa',   category: 'creditors', defaultAmount: 320.00,  dueDay: 4,      dueDatePattern: '*/4',  notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 13285.82, minMonthlyPayment: 330, availableCredit: 7714.18, creditLimit: 21000, apr: 18.00 } },
    { id: 'c-24', name: 'Best Buy',        category: 'creditors', defaultAmount: 58.00,   dueDay: 13,     dueDatePattern: '*/13', notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 0, minMonthlyPayment: 58, availableCredit: 10000, creditLimit: 10000, apr: 29.99 } },
    { id: 'c-25', name: 'Lowes',           category: 'creditors', defaultAmount: 0.00,    dueDay: null,   dueDatePattern: '',     notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 0, minMonthlyPayment: 0, availableCredit: 8000, creditLimit: 8000, apr: 31.99 } },
    { id: 'c-26', name: 'Old Navy',        category: 'creditors', defaultAmount: 0.00,    dueDay: 23,     dueDatePattern: '*/23', notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 0, minMonthlyPayment: 0, availableCredit: 400, creditLimit: 400, apr: 29.99 } },
    { id: 'c-27', name: 'USAA (Nicole)',   category: 'creditors', defaultAmount: 0.00,    dueDay: 12,     dueDatePattern: '*/12', notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 2395.62, minMonthlyPayment: 0, availableCredit: 7604.38, creditLimit: 10000, apr: 30.40 } },
    { id: 'c-28', name: 'Chase Amazon',    category: 'creditors', defaultAmount: 0.00,    dueDay: 17,     dueDatePattern: '*/17', notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 1500.86, minMonthlyPayment: 0, availableCredit: 8099.14, creditLimit: 9600, apr: 26.99 } },
    { id: 'c-29', name: 'BOH Hwn. Miles',  category: 'creditors', defaultAmount: 66.00,   dueDay: 3,      dueDatePattern: '*/3',  notes: '', active: true, muted: false, archived: false, tags: ['credit'], createdAt: '2026-01-01', updatedAt: '2026-01-01', trackDebt: true, debtDetail: { type: 'revolving', balanceOwed: 5727.05, minMonthlyPayment: 66, availableCredit: 5272.95, creditLimit: 11000, apr: 0, promoEndDate: '2027-02-01' } },
  ]
  
  // ─── Income Sources ───────────────────────────────────────────────────────────
  
  export const INCOMES: Income[] = [
    { id: 'inc-01', name: 'Chris BCI (Blackstone)', group: 'jobs',     type: 'Employment', owner: 'chris',  amount: 4400.00, frequency: 'biweekly',  active: true, muted: false, archived: false },
    { id: 'inc-02', name: 'Chris Blackstone',       group: 'jobs',     type: 'Employment', owner: 'chris',  amount: 2200.00, frequency: 'biweekly',  active: true, muted: false, archived: false },
    { id: 'inc-03', name: 'Nicole Sungage',         group: 'jobs',     type: 'Employment', owner: 'nicole', amount: 2100.00, frequency: '15th-30th', active: true, muted: false, archived: false },
    { id: 'inc-04', name: 'Monthly VA',             group: 'benefits', type: 'Benefit',    owner: 'chris',  amount: 2074.45, frequency: 'monthly',   active: true, muted: false, archived: false },
  ]
  
  // ─── Debts ────────────────────────────────────────────────────────────────────
  
  export const DEBTS: Debt[] = [
    // Credit Cards
    { id: 'd-01', name: 'Lowes',              type: 'credit_card', balance: 0,          minimumPayment: 0,      creditLimit: 8000,   availableCredit: 8000,   interestRate: 31.99, dueDate: '',     notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-02', name: 'N - Old Navy',       type: 'credit_card', balance: 0,          minimumPayment: 0,      creditLimit: 400,    availableCredit: 400,    interestRate: 29.99, dueDate: '*/23', notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-03', name: 'Best Buy CC',        type: 'credit_card', balance: 0,          minimumPayment: 58,     creditLimit: 10000,  availableCredit: 10000,  interestRate: 29.99, dueDate: '*/13', notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-04', name: 'N - USAA',           type: 'credit_card', balance: 2395.62,    minimumPayment: 0,      creditLimit: 10000,  availableCredit: 7604.38,interestRate: 30.40, dueDate: '*/12', notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-05', name: 'Chase Amazon',       type: 'credit_card', balance: 1500.86,    minimumPayment: 0,      creditLimit: 9600,   availableCredit: 8099.14,interestRate: 26.99, dueDate: '*/17', notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-06', name: 'BOH Hawn. Miles',    type: 'credit_card', balance: 5727.05,    minimumPayment: 66,     creditLimit: 11000,  availableCredit: 5272.95,interestRate: 0,     dueDate: '*/3',  notes: '0% interest until 2/1/2027', accountLastFour: '',  snapshotDate: '2025-04-13', active: true },
    { id: 'd-07', name: 'C - USAA',           type: 'credit_card', balance: 2732.00,    minimumPayment: 0,      creditLimit: 14000,  availableCredit: 20000,  interestRate: 21.90, dueDate: '*/20', notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-08', name: 'Navy Fed Visa',      type: 'credit_card', balance: 13285.82,   minimumPayment: 330,    creditLimit: 21000,  availableCredit: 7714.18,interestRate: 18.00, dueDate: '*/4',  notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
    { id: 'd-09', name: 'Cap 1 - FHH',       type: 'credit_card', balance: 6055.32,    minimumPayment: 2000,   creditLimit: 10350,  availableCredit: 4294.68,interestRate: 28.24, dueDate: '*/15', notes: '',                       accountLastFour: '',    snapshotDate: '2025-04-13', active: true },
  
    // Installment / Large Debts
    { id: 'd-10', name: 'Buick',              type: 'installment', balance: 22761.07,   minimumPayment: 550,    interestRate: 0,     dueDate: '*/19', notes: 'Auto loan',           accountLastFour: '', snapshotDate: '2025-12-01', active: true },
    { id: 'd-11', name: 'Student Loans',      type: 'student_loan',balance: 25744.43,   minimumPayment: 300,    interestRate: 0,     dueDate: '*/18', notes: 'Nelnet',              accountLastFour: '', snapshotDate: '2025-05-22', active: true },
    { id: 'd-12', name: 'Mortgage Balance',   type: 'mortgage',    balance: 201425.38,  minimumPayment: 1460.51,interestRate: 0,     dueDate: '*/30', notes: 'Freedom + PHH split', accountLastFour: '', snapshotDate: '2025-05-22', active: true },
  ]

  // ─── Default Template ─────────────────────────────────────────────────────────
  
  export const DEFAULT_TEMPLATE: Template = {
    id: 'tmpl-01',
    name: 'Standard Month',
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    modules: [
      {
        id: 'tm-01',
        owner: 'user-chris',
        source: 'Blackstone',
        relativePayDate: 'Early month (~5th)',
        bills: [
          { id: 'tb-01', creditorId: 'c-19', name: 'IRA',                   dueDatePattern: 'ASAP' },
          { id: 'tb-02', creditorId: 'c-07', name: 'Lyly Savings',          dueDatePattern: '*/9' },
          { id: 'tb-03', creditorId: 'c-16', name: 'YouTube',               dueDatePattern: '*/21' },
          { id: 'tb-04', creditorId: 'c-18', name: 'Disney+ & Hulu',        dueDatePattern: '*/17' },
          { id: 'tb-05', creditorId: 'c-21', name: 'CapOne FHH Credit Card',dueDatePattern: 'ASAP' },
          { id: 'tb-06', creditorId: 'c-22', name: 'USAA Signature - Chris',dueDatePattern: '*/20' },
        ],
      },
      {
        id: 'tm-02',
        owner: 'user-nicole',
        source: 'Sungage',
        relativePayDate: '15th',
        bills: [
          { id: 'tb-07', creditorId: 'c-01', name: 'Freedom Mortgage',      dueDatePattern: '*/30' },
          { id: 'tb-08', creditorId: 'c-02', name: 'PHH Mortgage',          dueDatePattern: '*/30' },
          { id: 'tb-09', creditorId: 'c-03', name: "Home Owner's Fee",      dueDatePattern: '*/30' },
          { id: 'tb-10', creditorId: 'c-08', name: 'T-Mobile',              dueDatePattern: '*/9' },
          { id: 'tb-11', creditorId: 'c-17', name: 'Wishbone Pet Health',   dueDatePattern: '*/1' },
        ],
      },
      {
        id: 'tm-03',
        owner: 'user-chris',
        source: 'Blackstone',
        relativePayDate: 'Mid month (~20th)',
        bills: [
          { id: 'tb-12', creditorId: 'c-05', name: 'Hawaii Storage',        dueDatePattern: '*/30' },
          { id: 'tb-13', creditorId: 'c-06', name: 'Lyly School Money',     dueDatePattern: '*/30' },
          { id: 'tb-14', creditorId: 'c-09', name: 'Buick',                 dueDatePattern: '*/19' },
          { id: 'tb-15', creditorId: 'c-12', name: 'Buick OnStar',          dueDatePattern: '*/10' },
          { id: 'tb-16', creditorId: 'c-20', name: 'HYSA Account',          dueDatePattern: 'ASAP' },
          { id: 'tb-17', creditorId: 'c-23', name: 'NFCU CC',               dueDatePattern: '*/4' },
          { id: 'tb-18', creditorId: 'c-24', name: 'Best Buy CC',           dueDatePattern: '*/13' },
        ],
      },
      {
        id: 'tm-04',
        owner: 'user-nicole',
        source: 'Sungage',
        relativePayDate: '30th',
        bills: [
          { id: 'tb-19', creditorId: 'c-10', name: 'Spectrum Cable',        dueDatePattern: '*/18' },
          { id: 'tb-20', creditorId: 'c-11', name: 'HECO Electricity',      dueDatePattern: '*/25' },
          { id: 'tb-21', creditorId: 'c-04', name: 'Nelnet Student Loan',   dueDatePattern: '*/18' },
          { id: 'tb-22', creditorId: 'c-15', name: 'NFCU Loan',             dueDatePattern: 'ASAP' },
          { id: 'tb-23', creditorId: 'c-14', name: 'Stock Trading Group',   dueDatePattern: '*/8' },
        ],
      },
    ],
  }
  
  // ─── May 2026 — Active Monthly Board ─────────────────────────────────────────
  
  export const MAY_2026_BOARD: MonthlyBoard = {
    id: 'board-may-2026',
    month: 5,
    year: 2026,
    label: 'May 2026',
    templateId: 'tmpl-01',
    status: 'active',
    sharedNotes: [],
    createdAt: '2026-05-01',
    updatedAt: new Date().toISOString(),
    modules: [
      {
        id: 'mod-01',
        templateModuleId: 'tm-01',
        owner: 'user-chris',
        source: 'Blackstone',
        payDate: '2026-05-05',
        payAmount: 2374.56,
        boardColumn: 1,
        headerColor: '#E6F1FB',
        isFromTemplate: true,
        sortOrder: 1,
        notes: [
          { id: 'n-01', authorId: 'user-nicole', authorName: 'Nicole', text: 'Can you pay the internet this check? Mine is heavy.', timestamp: '2026-05-01T09:42:00', unread: true },
        ],
        bills: [
          { id: 'b-01', name: 'IRA',                    amount: 100.00,  dueDate: 'ASAP', paid: true,  muted: false, notes: '', origin: 'master', creditorId: 'c-19' },
          { id: 'b-02', name: 'Lyly Savings',           amount: 100.00,  dueDate: '5/9',  paid: true,  muted: false, notes: '', origin: 'master', creditorId: 'c-07' },
          { id: 'b-03', name: 'YouTube',                amount: 28.00,   dueDate: '5/21', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-16' },
          { id: 'b-04', name: 'Disney+ & Hulu',         amount: 13.60,   dueDate: '5/17', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-18' },
          { id: 'b-05', name: 'CapOne FHH Credit Card', amount: 1000.00, dueDate: 'ASAP', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-21' },
          { id: 'b-06', name: 'USAA Signature - Chris', amount: 150.00,  dueDate: '5/20', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-22' },
        ],
      },
      {
        id: 'mod-02',
        templateModuleId: 'tm-02',
        owner: 'user-nicole',
        source: 'Sungage',
        payDate: '2026-05-15',
        payAmount: 2100.00,
        boardColumn: 1,
        headerColor: '#E8F7EE',
        isFromTemplate: true,
        sortOrder: 2,
        notes: [],
        bills: [
          { id: 'b-07', name: 'Freedom Mortgage',       amount: 1236.51, dueDate: '5/30', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-01' },
          { id: 'b-08', name: 'PHH Mortgage',           amount: 224.00,  dueDate: '5/30', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-02' },
          { id: 'b-09', name: "Home Owner's Fee",       amount: 832.40,  dueDate: '5/30', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-03' },
          { id: 'b-10', name: 'T-Mobile',               amount: 145.00,  dueDate: '5/9',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-08' },
          { id: 'b-11', name: 'Wishbone Pet Health',    amount: 25.00,   dueDate: '5/1',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-17' },
        ],
      },
      {
        id: 'mod-03',
        templateModuleId: 'tm-03',
        owner: 'user-chris',
        source: 'Blackstone',
        payDate: '2026-05-20',
        payAmount: 2200.00,
        boardColumn: 2,
        headerColor: '#E6F1FB',
        isFromTemplate: true,
        sortOrder: 3,
        notes: [],
        bills: [
          { id: 'b-12', name: 'Hawaii Storage',         amount: 41.65,   dueDate: '6/1',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-05' },
          { id: 'b-13', name: 'Lyly School Money',      amount: 50.00,   dueDate: '6/1',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-06' },
          { id: 'b-14', name: 'Buick',                  amount: 550.00,  dueDate: '5/19', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-09' },
          { id: 'b-15', name: 'Buick OnStar',           amount: 33.77,   dueDate: '6/10', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-12' },
          { id: 'b-16', name: 'HYSA Account',           amount: 175.00,  dueDate: 'ASAP', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-20' },
          { id: 'b-17', name: 'NFCU CC',                amount: 320.00,  dueDate: '6/4',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-23' },
          { id: 'b-18', name: 'Best Buy CC',            amount: 0.00,    dueDate: '5/13', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-24' },
        ],
      },
      {
        id: 'mod-04',
        templateModuleId: 'tm-04',
        owner: 'user-nicole',
        source: 'Sungage',
        payDate: '2026-05-30',
        payAmount: 2100.00,
        boardColumn: 2,
        headerColor: '#E8F7EE',
        isFromTemplate: true,
        sortOrder: 4,
        notes: [
          { id: 'n-02', authorId: 'user-chris', authorName: 'Chris', text: 'Pay extra toward CapOne this month if possible.', timestamp: '2026-05-02T14:15:00', unread: true },
        ],
        bills: [
          { id: 'b-19', name: 'Spectrum Cable',         amount: 187.12,  dueDate: '5/18', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-10' },
          { id: 'b-20', name: 'HECO Electricity',       amount: 230.00,  dueDate: '5/25', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-11' },
          { id: 'b-21', name: 'Nelnet Student Loan',    amount: 300.00,  dueDate: '5/18', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-04' },
          { id: 'b-22', name: 'NFCU Loan',              amount: 1177.82, dueDate: 'ASAP', paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-15' },
          { id: 'b-23', name: 'Stock Trading Group',    amount: 50.00,   dueDate: '5/8',  paid: false, muted: false, notes: '', origin: 'master', creditorId: 'c-14' },
        ],
      },
    ],
  }
  
  // ─── Assembled Seed Data ──────────────────────────────────────────────────────
  
  export const SEED_DATA: MyPayBoardData = {
    users: USERS,
    currentUserId: 'user-chris',
    creditors: CREDITORS,
    expenseCategories: EXPENSE_CATEGORIES,
    incomeTypes: INCOME_TYPES,
    incomes: INCOMES,
    debts: DEBTS,
    boards: [MAY_2026_BOARD],
    templates: [DEFAULT_TEMPLATE],
    appVersion: '0.1.0',
  }