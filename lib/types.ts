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
  | 'Credit Cards'
  | 'Savings'
  | 'Food & Household'
  | 'Transportation'
  | 'Miscellaneous'
  | string

export interface Creditor {
  id: string
  name: string
  category: ExpenseCategory
  /**
   * Planned monthly payment for household budgeting — Expenses & Income list,
   * monthly expense totals, and default amount when adding a bill from master.
   * Not the same as the lender minimum on tracked debt accounts.
   */
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
  accountLastFour?: string  // masked display only, e.g. "6789"
  accountLastFours?: string[] // multiple masked identifiers for one creditor
  trackDebt?: boolean
  debtDetail?: {
    type: 'revolving' | 'installment'
    balanceOwed: number
    /** Lender minimum due — Debt Overview totals. May differ from defaultAmount when you budget more than the minimum (or pay $0 min on a card). */
    minMonthlyPayment: number
    availableCredit?: number
    creditLimit?: number
    apr?: number
    promoEndDate?: string
  }
  /** Master-list mute: excluded from monthly budget totals; still visible in admin list and Debt Overview when trackDebt */
  muted: boolean
  archived: boolean
  archivedAt?: string
  owner?: 'chris' | 'nicole' | 'shared'
  active: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface IncomeSource {
  id: string
  name: string
  group: 'jobs' | 'benefits' | 'business' | 'other' | string
  type?: 'Employment' | 'Benefit' | string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | '15th-30th' | 'custom'
  owner: 'chris' | 'nicole' | 'shared'
  muted: boolean
  archived: boolean
  archivedAt?: string
  active: boolean
}

export type Income = IncomeSource

// ─── Bills (monthly board snapshots) ───────────────────────────────────────────
//
// Bills on a PayDateCard are copied snapshots for that month — name, amount, due
// date, paid/mute state, etc. are stored on the Bill itself. They are NOT live-linked
// to the master Creditor: changing a Creditor in Expenses & Income does not update
// existing board rows. creditorId (when origin === 'master') is only provenance —
// which master entry the row was created from — not a sync channel.

export type BillOrigin = 'master' | 'oneoff'

export interface Bill {
  id: string
  name: string
  amount: number
  dueDate: string
  category?: ExpenseCategory  // one-off default if later saved to Master List
  paid: boolean
  muted: boolean            // skipped for this month, not deleted
  notes: string
  origin: BillOrigin
  creditorId?: string       // source Creditor id if copied from master; row data is still a snapshot
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

// ─── Legacy board templates (seed / older board generation) ───────────────────

export interface LegacyTemplateBill {
  id: string
  creditorId: string        // always linked to Master List
  name: string              // display name pulled from Master List
  dueDatePattern: string
}

export interface LegacyTemplateModule {
  id: string
  owner: string             // user id
  source: string            // income source name e.g. "Blackstone"
  relativePayDate: string   // e.g. "Early month", "15th", "30th"
  bills: LegacyTemplateBill[]
}

export interface LegacyTemplate {
  id: string
  name: string
  isDefault: boolean
  modules: LegacyTemplateModule[]
  createdAt: string
  updatedAt: string
}

// ─── Monthly board templates (settings / create month) ────────────────────────

export interface TemplateBill {
  id: string
  masterListId: string // reference to the master list entry
  name: string
  amount: number
  dueDate: string
  category: string
}

export interface TemplatePayDateCard {
  id: string
  assignedUserId: string
  incomeSourceId: string
  defaultPayAmount: number
  defaultPayDate: string // e.g. "15" or "last" or a specific date string
  /** Header background color (hex). Defaults by owner in UI if unset */
  headerColor?: string
  bills: TemplateBill[]
}

export interface Template {
  id: string
  name: string
  isDefault: boolean
  assignedUserIds: string[]
  payDateCards: TemplatePayDateCard[]
  createdAt: string
  updatedAt: string
}

// ─── Pay Date Cards ───────────────────────────────────────────────────────────

/** 1 = first half of month column, 2 = second half */
export type BoardColumn = 1 | 2

export interface PayDateCard {
  id: string
  templatePayDateCardId?: string // which template pay date card this came from
  owner: string             // user id
  source: string            // e.g. "Blackstone", "Sungage", "VA Benefits"
  payDate: string           // actual date for this month e.g. "2026-05-05"
  payAmount?: number | null // editable per card; missing means unknown
  /** Snapshot bills for this pay period — not live-linked to Creditor; see Bill comments */
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
  payDateCards: PayDateCard[]
  status: BoardStatus
  sharedNotes: Note[]       // board-level notes separate from pay date card notes
  createdAt: string
  updatedAt: string
}

// ─── App Data Root ────────────────────────────────────────────────────────────

/** Household data as written to storage — session identity is never persisted here. */
export type PersistedMyPayBoardData = Omit<MyPayBoardData, 'currentUserId'>

export interface MyPayBoardData {
  users: User[]
  /** Runtime-only viewer id — derived from `mypayboard-user` session, not saved to shared storage. */
  currentUserId: string
  creditors: Creditor[]
  expenseCategories: string[]
  incomeTypes: string[]
  incomes: Income[]
  boards: MonthlyBoard[]
  templates: LegacyTemplate[]
  appVersion: string
}

// ─── UI State (not persisted) ─────────────────────────────────────────────────

export interface AppUIState {
  selectedBoardId: string | null
  selectedPayDateCardId: string | null
  selectedCreditorId: string | null
  sidebarOpen: boolean
  theme: 'light' | 'dark'
}