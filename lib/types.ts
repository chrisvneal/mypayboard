// ─── Users ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member' | 'viewer'

export interface User {
  id: string
  name: string
  role: UserRole
  avatarColor: string // tailwind bg class e.g. 'bg-navy-500'
  lastActive?: string
}

// ─── Master List ──────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'living'
  | 'subscriptions'
  | 'savings'
  | 'creditors'
  | 'Living Expenses'
  | 'Subscriptions'
  | 'Creditors'
  | 'Savings'
  | 'Food & Household'
  | 'Transportation'
  | 'Miscellaneous'
  | string

export interface Creditor {
  id: string
  name: string
  category: ExpenseCategory
  defaultAmount: number
  dueDay: number | 'varies' | 'asap' | null
  dueDatePattern: string    // e.g. "*/30"; kept for templates/current month helpers
  notes: string
  // Contact info — optional, added later
  address?: string
  phone?: string
  email?: string
  website?: string
  url?: string
  accountLastFour?: string  // faded display only, e.g. "6789"
  muted: boolean
  archived: boolean
  owner?: 'chris' | 'nicole' | 'shared'
  active: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface IncomeSource {
  id: string
  name: string
  group: 'jobs' | 'benefits' | 'other' | string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | '15th-30th' | 'custom'
  owner: 'chris' | 'nicole' | 'shared'
  notes?: string
  muted: boolean
  archived: boolean
  active: boolean
}

export type Income = IncomeSource

// ─── Debt ─────────────────────────────────────────────────────────────────────

export type DebtType = 'credit_card' | 'installment' | 'mortgage' | 'student_loan' | 'other'

export interface Debt {
  id: string
  name: string
  type: DebtType
  balance: number
  minimumPayment: number
  creditLimit?: number      // credit cards only
  availableCredit?: number  // credit cards only
  interestRate: number
  dueDate: string           // e.g. "10/15" (month/day)
  notes: string
  accountLastFour?: string
  snapshotDate: string      // date balance was last manually updated
  active: boolean
}

// ─── Bills (inside modules) ───────────────────────────────────────────────────

export type BillOrigin = 'master' | 'oneoff'

export interface Bill {
  id: string
  name: string
  amount: number
  dueDate: string
  paid: boolean
  muted: boolean            // skipped for this month, not deleted
  notes: string
  origin: BillOrigin
  creditorId?: string       // linked to Master List if origin === 'master'
  promotedToMaster?: boolean // user opted to save one-off to Master List
  /** Row highlight background / border hint; omit or #FFFFFF for default */
  rowColor?: string
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  authorId: string
  authorName: string
  text: string
  timestamp: string
  unread: boolean
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface TemplateBill {
  id: string
  creditorId: string        // always linked to Master List
  name: string              // display name pulled from Master List
  dueDatePattern: string
}

export interface TemplateModule {
  id: string
  owner: string             // user id
  source: string            // income source name e.g. "Blackstone"
  relativePayDate: string   // e.g. "Early month", "15th", "30th"
  bills: TemplateBill[]
}

export interface Template {
  id: string
  name: string
  isDefault: boolean
  modules: TemplateModule[]
  createdAt: string
  updatedAt: string
}

// ─── Pay Date Modules ─────────────────────────────────────────────────────────

/** 1 = first half of month column, 2 = second half */
export type BoardColumn = 1 | 2

export interface PayDateModule {
  id: string
  templateModuleId?: string // which template module this came from
  owner: string             // user id
  source: string            // e.g. "Blackstone", "Sungage", "VA Benefits"
  payDate: string           // actual date for this month e.g. "2026-05-05"
  payAmount?: number | null // editable per module; missing means unknown
  bills: Bill[]
  notes: Note[]
  isFromTemplate: boolean
  sortOrder: number         // controls display order, updates when payDate changes
  /** Which column on the monthly board (two-column layout) */
  boardColumn?: BoardColumn
  /** Header background color (hex). Defaults by owner in UI if unset */
  headerColor?: string
}

// ─── Monthly Boards ───────────────────────────────────────────────────────────

export type BoardStatus = 'active' | 'preparing' | 'archived'

export interface MonthlyBoard {
  id: string
  month: number             // 1-12
  year: number
  label: string             // e.g. "May 2026"
  templateId?: string       // which template it was built from
  modules: PayDateModule[]
  status: BoardStatus
  sharedNotes: Note[]       // board-level notes separate from module notes
  createdAt: string
  updatedAt: string
}

// ─── App Data Root ────────────────────────────────────────────────────────────

export interface MyPayBoardData {
  users: User[]
  currentUserId: string
  creditors: Creditor[]
  incomes: Income[]
  debts: Debt[]
  boards: MonthlyBoard[]
  templates: Template[]
  appVersion: string
}

// ─── UI State (not persisted) ─────────────────────────────────────────────────

export interface AppUIState {
  selectedBoardId: string | null
  selectedModuleId: string | null
  selectedCreditorId: string | null
  selectedDebtId: string | null
  sidebarOpen: boolean
  theme: 'light' | 'dark'
}