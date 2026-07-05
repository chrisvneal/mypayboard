@AGENTS.md

# MyPayBoard Project Context

> This file is the single source of truth for Claude when working on MyPayBoard.
> Read this before every session. Do not infer project context from general knowledge.

---

## What This Project Is

**MyPayBoard** (MyPayBoard.com) is a collaborative household budgeting web app for couples and household partners. It is a modernized version of a custom Excel budgeting workflow.

The app is built around one core question:

> "What needs to be paid when we get paid?"

This is a **planning-first** app organized around income events (paychecks), not calendar months. That paycheck-centric mental model is the sharpest competitive differentiator — it is an unoccupied position across all known competitors.

**This is NOT:**

- A bank integration tool
- A spending analytics dashboard
- An investment or net worth tracker
- A bookkeeping platform

**This IS:**

- A paycheck allocation workspace
- A collaborative household financial command center
- A modernized, practical planning tool for two people managing shared finances

---

## Tech Stack

| Layer       | Choice                          |
| ----------- | ------------------------------- |
| Framework   | Next.js 16.2.6 (App Router)     |
| UI          | React 19.2.4, TypeScript        |
| Styling     | Tailwind CSS v4                 |
| Auth        | Clerk (`@clerk/nextjs` ^7.5.7)  |
| Icons       | Lucide React                    |
| Drag & Drop | @dnd-kit                        |
| Storage     | localStorage data (Supabase planned) |
| IDE         | Cursor Pro with Claude Code     |

---

## localStorage Architecture

Three clearly scoped buckets — do not mix them:

| Key                         | Owner                | Contents                        |
| --------------------------- | -------------------- | ------------------------------- |
| `mypayboard-data`           | `useMyPayBoard` hook | All household financial data    |
| `mypayboard-user`           | `lib/session.ts`     | Session identity (current user) |
| `mypayboard-prefs-{userId}` | `lib/userPrefs.ts`   | Per-user display preferences    |

**Strip-before-save rule:** Runtime-only fields (e.g. `currentUserId`, computed flags) must be removed before writing to localStorage. This discipline must be extended to any new runtime fields.

---

## Users & Auth

Clerk (`@clerk/nextjs` ^7.5.7) is the sole authentication provider.

**Flow:**
- Sign-in/sign-up are custom client pages at `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]`.
- Both pages initiate Clerk Google OAuth (`strategy: 'oauth_google'`) and redirect to `/dashboard` on success.
- `app/sign-in/sso-callback/page.tsx` renders `AuthenticateWithRedirectCallback` to complete the OAuth handshake.
- `app/layout.tsx` wraps the entire app in `ClerkProvider`.

**Route guard:**
- `proxy.ts` uses `clerkMiddleware` and `auth.protect()` to guard all matched routes.
- `/sign-in(.*)` and `/sign-up(.*)` are explicitly excluded from protection.
- Next.js 16.2.6 uses `proxy.ts` instead of the older `middleware.ts` convention.

**Session bridge (Clerk → app identity):**
- Dashboard routes wait for Clerk's `useUser()` to resolve before mounting content (`app/dashboard/layout.tsx`).
- `syncFromClerk(user.id)` is called on mount to write the `mypayboard-user` localStorage key using the Clerk user ID directly as the session identity.
- Sign-out clears `mypayboard-user` and calls Clerk `signOut({ redirectUrl: '/sign-in' })`.

**Required environment variables:**
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`.

**Users:** Any Clerk-authenticated user via Google OAuth. Workspace membership is managed within the app (planned: Supabase).

---

## Design System

### Feel

Calm, operational, structured. Inspired by **Notion / Linear** — not banking apps or SaaS dashboards. The interface should feel like a modern household planning board.

**Avoid:** neon accents, bounce/spring animation, pill-heavy tabs, thick borders everywhere, whole-row opacity washouts, browser `alert`/`prompt` flows.

### Colors

| Token                               | Use                                                |
| ----------------------------------- | -------------------------------------------------- |
| `--navy` `#185FA5`                  | Brand, links, active states, info                  |
| `--green` `#3A9D5D`                 | Healthy balance, income amounts, success           |
| `--danger` / `--danger-muted`       | Negative balance, destructive actions (restrained) |
| `--text-primary/secondary/tertiary` | Body hierarchy                                     |
| `--bg-primary/secondary/tertiary`   | Surface hierarchy                                  |

### Typography

- **Font:** Manrope
- Pay dates in modules: full format — `May 4, 2026`
- Bill due dates in rows: compact `M/D` or `ASAP`

### Themes (3)

- **Daylight** — white canvas, current light default
- **Midnight** — dark/graphite surfaces
- **Business** — warm white, deeper navy (future polish)

### Motion

Goal is **visual continuity**, not animation. All transitions ~150–200ms, `ease-out`. No bounce, no spring, no dramatic transforms.

---

## Sidebar Navigation

```
MyPayBoard (logo)
─────────────────
Workspace
  Pay Boards  [+] ▾     ← [+] is an icon-only "New Pay Board" button; ▾ expands the non-archived board list
    └ June 2026
    └ July 2026
  Debt Tracker
─────────────────
Manage
  Bills & Income
  Templates
  Archive
─────────────────
System
  Settings ▾
    └ Overview
    └ Organize Lists
```

Active state: navy left border + navy text + light blue background.

---

## Routes & Pages

| Route | Page component | Purpose |
| ----- | -------------- | ------- |
| `/` | `app/page.tsx` | Redirects to `/dashboard`; Clerk middleware sends unauthenticated users to sign-in |
| `/login` | `app/login/page.tsx` | Legacy redirect to `/dashboard` |
| `/sign-in/[[...sign-in]]` | `app/sign-in/[[...sign-in]]/page.tsx` | Custom Clerk Google OAuth sign-in |
| `/sign-in/sso-callback` | `app/sign-in/sso-callback/page.tsx` | Clerk OAuth callback |
| `/sign-up/[[...sign-up]]` | `app/sign-up/[[...sign-up]]/page.tsx` | Custom Clerk Google OAuth sign-up |
| `/dashboard` | `MonthlyBoard` | **Pay Boards** — active monthly board workspace (pay date card grid, DnD, bill states) |
| `/dashboard/bills-and-income` | `IncomeExpensesPage` | **Bills & Income** — master list for creditors (expenses) and income sources |
| `/dashboard/debt-tracker` | `DebtTrackerPage` | **Debt Tracker** — filtered view of creditors with `trackDebt === true` |
| `/dashboard/archive` | `ArchivePage` | **Archive** — restore or permanently delete archived expenses, income, and boards (tabbed) |
| `/dashboard/settings/templates` | `TemplatesPage` | **Templates** — list, create, set default, delete board templates |
| `/dashboard/settings/templates/[id]/edit` | `TemplateEditor` | **Edit Template** — blueprint editor (pay date cards + bills, refresh from master list) |
| `/dashboard/settings` | placeholder | **Settings Overview** — stub heading only (no content yet) |
| `/dashboard/settings/organize` | `OrganizePage` | **Organize Lists** — manage expense/income category groups and ordering |

**Redirects** (`next.config.ts`):

- `/dashboard/templates` → `/dashboard/settings/templates` (legacy)
- `/dashboard/master-list` → `/dashboard/bills-and-income`
- `/dashboard/expenses-and-income` → `/dashboard/bills-and-income`
- `/dashboard/debt-overview` → `/dashboard/debt-tracker` (legacy)

**Auth guard:** Clerk protects matched routes in `proxy.ts`; dashboard UI waits for Clerk `useUser()` before syncing the internal `mypayboard-user` session via `lib/session.ts`. Last visited route per user is stored in `mypayboard-prefs-{userId}`.

---

## Application Layers

### Layer 1 — Bills & Income

**Route:** `/dashboard/bills-and-income`

The permanent source of truth for all creditors, expenses, and income sources. Changes here:

- **Name/category changes** → global, reflected everywhere
- **Amount changes** → future templates only (no retroactive board updates)
- **Archive** → removes from template pre-population, non-destructive
- **Mute** → sets default mute state for new template instances

Key behaviors:

- Expand-in-place editing (no modals)
- Muted items stay visible but dimmed; eye-slash icon always full opacity
- Account number pills (`•••• 6055`) inline in rows
- **Track in Debt Tracker** checkbox on expense edit form populates `debtDetail` on the `Creditor` record
- Archive ≠ Delete — archive is reversible; delete is permanent and requires confirmation

### Layer 2 — Templates

**Route:** `/dashboard/settings/templates` (edit: `/dashboard/settings/templates/[id]/edit`)

Templates are **frozen snapshots** of the master list at time of save. The data chain:

```
Master List → (live pull while editing) → Template → (frozen snapshot on save) → Board (fully isolated)
```

Rules:

- Templates pull live master list values **while editing only**
- Saving freezes those values — template owns them independently after that
- Boards created from templates are **fully isolated** — no changes propagate back
- **Refresh from Master List** button re-pulls live values without saving
- No autosave — changes commit only on explicit Save

### Layer 3 — Month Boards (Current Month)

**Route:** `/dashboard` (or monthly board routes)

The primary daily workspace. Pay Date Card grid (two columns, drag-and-drop). Board statuses: `active` | `preparing` | `archived`.

---

## Pay Date Cards — Core Feature

> **Naming:** UI copy says “pay date card” / “paycheck”; the type is `PayDateCard` (older docs may say “PayDateModule”).

Each card = one paycheck event + the bills planned against it before the next payday.

Examples: `Partner 1 Pay — Blackstone | May 20 | $2,200`

### Module Structure

- **Header:** owner, income source, pay date (clickable → `PayDateEditor`), pay amount (inline editable), ⋮ menu, optional header color
- **Tabs:** Unpaid · Paid · Messages
- **Footer:** Total Expenses (left) + optional muted count/amount line · Remaining balance (right, color-coded)

### Bill Row Grid

`drag handle · checkbox · color pipe · bill name · due date · amount · actions`

### Key Bill States

- **Paid** — handled this month
- **Muted** — skipped this month, not deleted
- **One-off** — module-only until user explicitly clicks **Save to Master**

### Header Colors (curated swatches)

Planner/stationery tones — Neutral, Blue, Green, Gold, Rose, Lavender, Slate, Brown, Plum, Mist, Sand. No neon, no harsh colors.

---

## Debt Tracker Page

**Route:** `/dashboard/debt-tracker` (sidebar label: **Debt Tracker**)

Not a separate data model — filters `Creditor` records where `trackDebt === true`. Fields live on the `Creditor` record (`trackDebt`, `debtDetail`). Edit debt details via **Bills & Income → expand expense → Track in Debt Tracker**.

Two amounts per creditor:

- `defaultAmount` — planned monthly budget payment
- `debtDetail.minMonthlyPayment` — lender minimum (may differ)

---

## Component Map (Quick Reference)

### App shell & shared

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `sidebar.tsx` (`DashboardSidebar`) | `components/` | Sidebar nav, pay board list, archive/delete board actions, create-month trigger |
| `app/dashboard/layout.tsx` | `app/` | Auth guard, theme toggle, mobile sidebar, `MyPayBoardProvider` wrapper |
| `MyPayBoardProvider.tsx` | `lib/` | React context wrapping `useMyPayBoardStore` |
| `useMyPayBoard.ts` | `lib/` | localStorage CRUD, board/template/creditor/income operations, computed totals |
| `AppModal.tsx` | `components/` | Shared modal shell (create month, create template) |
| `ConfirmButton.tsx` | `components/` | Two-step confirm for destructive actions |
| `ErrorBoundary.tsx` | `components/` | Dashboard content error boundary |
| `ThemeInitScript.tsx` | `components/` | Pre-hydration theme class to avoid flash |
| `AmountInput.tsx` | `shared/` | Shared currency-formatted input — used by expense/income/multi-bill forms and `PayDateCardInlineForm` |

### Pay Boards (`/dashboard`)

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `MonthlyBoard.tsx` | `board/` | Active board shell, pay date card CRUD wiring, header color prefs |
| `BoardWorkspace.tsx` | `board/` | Two-column DnD grid, cross-card bill moves |
| `AddPayDateCardSlot.tsx` | `board/` | “Add paycheck” slot in column |
| `PayDateCardInlineForm.tsx` | `components/` | Inline form to add a new pay date card (board and template variants); selecting an income source auto-fills the pay amount |
| `CreateMonthModal.tsx` | `components/` | New monthly board from template (modal) |
| `PayDateCard.tsx` | `modules/` | Pay date card shell — tabs, bill list, notes, totals |
| `ModuleHeader.tsx` | `modules/` | Owner, income source, pay date/amount, ⋮ menu, header color |
| `ModuleTabs.tsx` | `modules/` | Unpaid · Paid · Messages tab bar |
| `ModuleFooter.tsx` | `modules/` | Expenses / remaining balance / muted summary |
| `BillRow.tsx` / `SortableBillRow.tsx` | `modules/` | Bill row UI + drag reorder |
| `ModuleBillTableHeader.tsx` | `modules/` | Sortable column headers within a card |
| `DueDateEditor.tsx` / `DueDateField.tsx` | `modules/` | Bill due date popover / field |
| `PayDateEditor.tsx` / `PayDateField.tsx` | `modules/` | Card pay date popover / field |
| `AddBillInline.tsx` / `AddBillSection.tsx` | `modules/` | Add bill + master list search |
| `NotesPanel.tsx` | `modules/` | Per-card notes thread + composer |
| `HeaderColorSwatchPicker.tsx` | `modules/` | Curated header color swatches |
| `BillRowColorPicker.tsx` | `modules/` | Row highlight color picker |

### Bills & Income (`/dashboard/bills-and-income`)

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `IncomeExpensesPage.tsx` | `income-expenses/` | Page shell, summary cards, two-column layout |
| `ExpensesColumn.tsx` / `IncomeColumn.tsx` | `income-expenses/` | Category-grouped or list view per side |
| `CategoryGroup.tsx` | `income-expenses/` | Collapsible group card |
| `ExpenseRow.tsx` / `IncomeRow.tsx` | `income-expenses/` | Surface row display |
| `ExpenseEditForm.tsx` / `IncomeEditForm.tsx` | `income-expenses/` | Expand-in-place create/edit |
| `MultiBillForm.tsx` | `income-expenses/` | Batch "Add multiple" bill entry — stacked validated rows, per-row expandable detail fields |
| `ExpenseListView.tsx` / `IncomeListView.tsx` | `income-expenses/` | Flat list view variant |
| `SummaryCards.tsx` | `income-expenses/` | Monthly expense/income totals |
| `ViewToggle.tsx` / `DisplayToggle.tsx` | `income-expenses/` | Grouped vs list; optional column visibility |
| `CollapsibleEditPanel.tsx` | `income-expenses/` | Shared expand-in-place panel wrapper |

### Debt Tracker (`/dashboard/debt-tracker`)

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `DebtTrackerPage.tsx` | `debt-tracker/` | Page shell, filter, table layout |
| `DebtSummaryCards.tsx` | `debt-tracker/` | Balance / payment summary cards |
| `DebtFilterBar.tsx` | `debt-tracker/` | Revolving vs installment filter |
| `DebtTable.tsx` / `DebtTableRow.tsx` / `DebtTableFooter.tsx` | `debt-tracker/` | Sortable debt table |

### Archive (`/dashboard/archive`)

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `ArchivePage.tsx` | `archive/` | Tabbed archive shell (expenses · income · boards) |
| `ExpensesArchiveTab.tsx` | `archive/` | Archived creditors — restore / delete |
| `IncomeArchiveTab.tsx` | `archive/` | Archived income — restore / delete |
| `BoardsArchiveTab.tsx` | `archive/` | Archived boards — restore / delete |

### Templates (`/dashboard/settings/templates`)

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `TemplatesPage.tsx` | `templates/` | Template list, default badge, create/delete |
| `TemplateEditor.tsx` | `templates/` | Full template workspace (reuses `PayDateCard` in template mode) |
| `CreateTemplateModal.tsx` | `components/` | New template creation modal |

### Settings (`/dashboard/settings/organize`)

| Component | Location | Responsibility |
| --------- | -------- | -------------- |
| `OrganizePage.tsx` | `settings/` | Organize Lists page shell |
| `OrganizeCategorySection.tsx` | `settings/` | Bill/income group editor (rename, reorder, delete) |

---

## Data Schema (localStorage — no database yet)

There is **no Supabase/PostgreSQL schema** in this repo. All persistence is browser `localStorage`, structured for future migration. Canonical types live in `lib/types.ts`.

### `mypayboard-data` — shared household record

```ts
MyPayBoardData {
  users: User[]
  creditors: Creditor[]           // master-list expenses/bills
  expenseCategories: CategoryDefinition[]
  incomeCategories: CategoryDefinition[]
  incomes: Income[]               // income sources
  boards: MonthlyBoard[]          // monthly pay boards
  boardTemplates: Template[]      // reusable board blueprints
  appVersion: string
}
// currentUserId is runtime-only — stripped before save (PersistedMyPayBoardData)
```

**Nested shapes:**

| Type | Key fields | Notes |
| ---- | ---------- | ----- |
| `Creditor` | `name`, `category`/`categoryId`, `defaultAmount`, `dueDay`, `trackDebt`, `debtDetail`, `muted`, `archived` | Master list expense; `debtDetail` holds balance, min payment, APR, etc. |
| `Income` | `name`, `amount`, `frequency`, `owner`, `categoryId`, `muted`, `archived` | Income source |
| `CategoryDefinition` | `name`, `scope` (`expense` \| `income`), `order`, `isDefault` | Organize Lists groups |
| `Bill` | `name`, `amount`, `dueDate`, `paid`, `muted`, `origin`, `creditorId?`, `rowColor?` | **Snapshot** on a board — not live-linked to `Creditor` |
| `PayDateCard` | `owner`, `source`, `payDate`, `payAmount`, `bills[]`, `notes[]`, `boardColumn`, `headerColor` | One paycheck module on a board |
| `MonthlyBoard` | `month`, `year`, `label`, `status`, `payDateCards[]`, `templateId?`, `createdAt`, `updatedAt` | `status`: `active` \| `preparing` \| `archived` |
| `Template` | `name`, `isDefault`, `payDateCards[]`, `assignedUserIds[]` | Frozen blueprint; `TemplateBill.masterListId` references master list |

**Legacy migration on load:** `useMyPayBoard` merges old keys (`myPayBoard_templates`) into `mypayboard-data`.

### `mypayboard-user` — session (per browser)

```ts
{ id: string }  // Clerk user ID written by syncFromClerk()
```

### `mypayboard-prefs-{userId}` — per-user UI prefs

```ts
UserPrefs {
  theme, expenseView, incomeView,
  expenseGroupOpenState, incomeGroupOpenState,
  expenseDisplayPrefs, moduleHeaderColors,
  readNoteIds, lastDashboardPath
}
```

---

## Setup & Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

- **Status:** Active development, private beta (see `README.md`).
- **Deployment:** No Vercel/Docker config in repo — standard Next.js `build` + `start` when ready.
- **Seed data:** `lib/mockData.ts` has been deleted (Phase 1 of launch cleanup). New users start with `EMPTY_STATE` defined in `lib/useMyPayBoard.ts`. `ensureCategorySeeds()` populates default category groups on first load. Do not restore any hardcoded household data.
- **UI primitives:** shadcn/Radix (`components/ui/`) — button, popover, dropdown-menu, calendar, select.
- **Path aliases:** `@/` → project root (see `tsconfig.json`).
- **Navigation guard:** `lib/navigation-guard.ts` warns on unsaved template edits before route change.

---

## Key Types (lib/types.ts)

```ts
User              // id, name, role, avatarColor
CategoryDefinition // Organize Lists group
Creditor          // master list entry; trackDebt, debtDetail, defaultAmount
Income            // income source (alias IncomeSource)
Bill              // board snapshot; origin: 'master' | 'oneoff', paid, muted, rowColor
Note              // per pay date card; unread is per-viewer via readNoteIds prefs
PayDateCard       // headerColor, boardColumn, payDate, payAmount, bills[], notes[]
Template          // board blueprint with TemplatePayDateCard[] + TemplateBill[]
MonthlyBoard      // status: active | preparing | archived; createdAt/updatedAt timestamps
MyPayBoardData    // root persisted object (minus runtime currentUserId)
```

---

## What's Built vs. What's Planned

### ✅ Built

- Pay date card system (tabs, DnD, inline editing, color rows, notes, per-user header colors)
- Pay Boards sidebar (board list, create month, archive/delete from sidebar)
- Bills & Income page (collapsible groups, expand-in-place, account pills, mute toggle, list/grouped views, batch "Add multiple" bill entry via `MultiBillForm`)
- Templates page + template editor (`/dashboard/settings/templates`, `[id]/edit`)
- Create month modal (new board from template)
- Archive page (tabbed: expenses, income, boards — restore/delete)
- Debt Tracker page (sortable table, summary cards, type filter)
- Organize Lists settings page (bill/income group management)
- Clerk Google OAuth flow + route guard + app-local session bridge + per-user last-route restore
- State management (3-bucket localStorage architecture + legacy key migration)
- Light/dark theme toggle (Daylight / Midnight)
- Mobile responsive layout (functional across all pages)

### 🔲 Planned

- **Settings Overview** page content (currently placeholder heading)
- Monthly board stat cards on dashboard header
- Business theme polish
- Supabase migration + multi-device sync
- Free tier design

---

## Product Principles — Read Before Every Feature Decision

1. **Planning-first, not tracking-first.** The paycheck-centric model is the core differentiator. Never dilute it.

2. **Avoid feature creep.** Chris has explicitly noted a tendency to over-add. When in doubt, ship the focused version and move on.

3. **No investment/net worth features.** No crypto, investment dashboards, credit score monitoring. Competitors own that space. MyPayBoard doesn't go there.

4. **Household collaboration is a first-class concern.** Named modules, per-module notes, unread indicators — these exist because coordinating finances with a partner is the actual job to be done.

5. **Non-destructive by default.** Mute > delete. Archive > delete. Move > remove. Every action should be reversible where possible.

6. **No modals for editing.** Expand-in-place is the UX pattern. Modals only for creation flows where a blank canvas is needed (e.g., Create New Month, Create New Template).

7. **Changes propagate forward only.** The master list is canonical. Existing boards are never retroactively changed.

8. **Strip runtime fields before save.** Any field that only exists during a session must not be persisted to localStorage.

---

## How to Work with Chris on This Project

- **Design/product thinking** — Claude acts as a thinking partner for feature decisions, UX patterns, and product direction.
- **Implementation** — Build prompts are saved as structured markdown files (e.g. `PHASE5_BUILD_PROMPT.md`) and handed off to Cursor Pro (Claude Code).
- **Fix/refinement prompts** — Formatted as consolidated, specific Cursor-ready prompts organized by phase, enabling clean git commits between rounds.
- **Spec document** — `docs/specs/payboard.md` is the master project spec; feature specs live in `docs/specs/`. Keep them up to date; suggest updates when decisions are made.
- **Testing** — Structured in layers: login/nav → pay date cards → bill interactions → notes → expenses/income → debt tracker → before fixes are batched.

---

## Competitor Landscape (for positioning reference)

Monarch Money, Honeydue, YNAB, Goodbudget, EveryDollar, PocketGuard, Quicken Simplifi, Rocket Money, Copilot, Envelope (~23 total reviewed). None occupy the paycheck-first planning position. That gap is MyPayBoard's primary marketing hook.

---

_Last updated: July 2026_
