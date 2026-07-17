# MyPayBoard

**Status:** Shipped
**Last updated:** July 17, 2026


## Overview

- **Name:** MyPayBoard / MyPayBoard.com
- **Domain:** MyPayBoard.com
- **Type:** Collaborative household budgeting tool
- **Users:** Any Clerk-authenticated household partner — full admin access
- **Stack:** Next.js 16.2.6 (App Router), React 19.2.4, TypeScript, Tailwind CSS v4, Clerk (`@clerk/nextjs` ^7.5.7) for authentication, Supabase (PostgreSQL + Realtime) for household data, Lucide icons, `@dnd-kit` for drag-and-drop, `radix-ui` + `shadcn` for UI primitives, `date-fns` + `react-day-picker` for date handling, `class-variance-authority` / `clsx` / `tailwind-merge` for styling utilities, `tw-animate-css` for transitions

---


The entire app revolves around one question:

> "What needs to be paid when we get paid?"

This is **not**:

- A bank integration tool
- A spending analytics app
- A bookkeeping platform
- A flashy SaaS dashboard

This **is**:

- A paycheck allocation workspace
- A collaborative household financial command center
- A modernized version of a custom Excel budgeting workflow

### Product feel

The interface should feel:

- **Calm** — low visual noise, no alarmist UI
- **Structured** — grids, labels, and hierarchy do the organizing
- **Minimal** — spacing and typography carry the design, not heavy chrome
- **Stable** — layout does not jump when state changes (muted summary, tabs, expansions)
- **Operational** — built for repeated monthly use, not demos
- **Collaborative** — shared boards, notes, clear ownership per pay date card
- **Lightly customizable** — header colors, row colors, without theme chaos
- **Sleek in interaction** — short, understated motion; contextual popovers; no browser prompts

Design inspiration: a **modern household planning board** — closer to Notion / Linear editorial calm than to banking apps or segmented mobile controls.

**Avoid:** neon accents, bounce/spring animation, pill-heavy tabs, thick borders everywhere, whole-row opacity washouts, browser `alert`/`prompt` flows, “dashboard-heavy” button styling.

---


- `/lib/types.ts` — all TypeScript interfaces
- `/lib/useMyPayBoard.ts` — Supabase-backed store hook, CRUD + computed values, Realtime refetch wiring
- `/lib/hooks/useSupabaseData.ts` — thin household-scoped Supabase CRUD helpers
- `/lib/hooks/useRealtime.ts` — Realtime subscriptions for notes and bills
- `/lib/hooks/useUsers.ts` — household member list from Supabase
- `/lib/supabase/mappers/*` — row ↔ TypeScript mappers (boards, creditors, incomes, templates, categories)
- `/lib/userPrefs.ts` — per-user UI prefs (Supabase `user_prefs` table)
- `/lib/session.ts` — Clerk → session bridge (`mypayboard-user` localStorage cache)
- `/scripts/migrate-localstorage.ts` — one-time browser migration from legacy `mypayboard-data`
- `/lib/due-date.ts` — due date display/normalization for bills
- `/lib/pay-date.ts` — ISO pay date parsing (local calendar, no UTC shift)
- `/lib/money-input.ts` — currency input helpers

No seed data ships in the app — `lib/mockData.ts` was deleted as part of launch cleanup. New users start from `EMPTY_STATE` in `useMyPayBoard.ts`; `ensureCategorySeeds()` populates default category groups on first load.

### Key types

- `User` — id (Clerk id in app layer), name, role, `avatarColor` (hex from pay date card header palette)
- `MyPayBoardData` — household root; includes optional `workspaceName`, `users[]`, creditors, categories, incomes, boards, templates; `currentUserId` is runtime-only
- `Creditor` — Bills entry (household bills on Bills & Income)
- `Bill` — `origin: 'master' | 'oneoff'`, `paid`, `muted`, optional `rowColor`
- `Note` — per pay date card, `unread`
- `PayDateCard` — `owner` (workspace member id or `'shared'`), `headerColor`, `boardColumn`, `payDate`, `payAmount`, `bills[]`, `notes[]`
- `MonthlyBoard` — `status: active | preparing | archived`, `createdAt`, `updatedAt`

### Data & persistence

Household financial data lives in **Supabase**, scoped by `household_id`. The React store in `useMyPayBoard.ts` hydrates from Supabase on load, writes changes via debounced Supabase upserts/updates, and keeps an in-memory working copy for the session.

| Layer | Storage | Contents |
| ----- | ------- | -------- |
| Household data | Supabase (`households`, `users`, `category_definitions`, `creditors`, `incomes`, `boards`, `pay_date_cards`, `bills`, `notes`, `board_templates`, …) | All shared financial records |
| Per-user UI prefs | Supabase `user_prefs` | Theme, list/grouped views, display toggles, header colors, read note ids, last dashboard path |
| Session identity | `mypayboard-user` (localStorage) | Clerk user id only — synchronous bridge so hooks can resolve identity before Clerk finishes hydrating |
| Theme flash cache | `mypayboard-theme-cache-{userId}` (localStorage) | Narrow theme-only cache to avoid light/dark flash before prefs load |

**One-time migration:** On first load after the Supabase cutover, `migrateLocalStorageToSupabase()` reads legacy `mypayboard-data`, upserts rows into Supabase, sets a `localStorageMigrated` flag in `user_prefs`, and clears the old data bucket.

**Realtime (partial):** `useRealtime` subscribes to `notes` and `bills` changes for the household. Notes use an add-only merge; bills use upsert-by-id merge. Full board / pay-date-card Realtime is **not** enabled — those refresh on initial load only. Known tradeoff: `bills` has no `updated_at`, so concurrent in-flight edits could theoretically be overwritten by a Realtime refetch.

**Avatar colors:** Stored as hex on the Supabase `users.avatar_color` column. UI resolves display via `resolveUserAvatarStyle()` in `header-colors.ts` (maps palette swatches + legacy navy to theme-aware foreground/background).

**Pay date card owner:** Supabase `pay_date_cards.owner` is nullable; `NULL` reads back as `'shared'` in the app layer. New pay date cards (board and template) default Owner to the current user. The **Shared** option appears only when the household has at least two members.

**Income Person / owner:** New income sources default Person to the current user (not Shared). Same Shared gate: selectable only when the household has at least two members.

---


All creditor and income data is entered by the user via Bills & Income. No data is pre-seeded in the production app. The data schema supports income sources with `owner` (workspace member ID or `'shared'`), `frequency`, and `group` (category). Creditors with `trackDebt: true` appear in the Debt Tracker with `debtDetail` (balance, minimum payment, APR, credit limit).


## Layout

### Sidebar Navigation

```
MyPayBoard (logo)
─────────────────
WORKSPACE
  Pay Boards  [+] ▾
    May 2026
    …
  Debt Tracker

MANAGE
  Bills & Income
  Templates
  Archive

SYSTEM
  Settings ▾
    Overview
    Organize Lists
─────────────────
```

- **WORKSPACE** — daily planning: Pay Boards (row label, an icon-only **+** button for creating a new board, and a chevron to expand/collapse the non-archived board list) and Debt Tracker. There is no "+ New Pay Board" text row — the plus is a bare icon (`aria-label`/`title` "New Pay Board" only) sitting to the right of the "Pay Boards" label.
- **MANAGE** — household data admin: Bills & Income, Templates, Archive
- **SYSTEM** — app configuration: Settings with **Overview** and **Organize Lists** sub-links
- Active nav item: navy left border + navy text + light blue background
- Bottom of sidebar: current user avatar + name + sign out (avatar uses `resolveUserAvatarStyle()`)
- Workspace name in sidebar header — renders only after client mount to avoid hydration mismatch
- Collapsible on mobile; fixed sidebar on desktop (`--sidebar-width: 220px`)

### Page naming note

The route `/dashboard` is the active **Pay Board** workspace. The sidebar label is **Pay Boards** because it expands into the available board list. **Do not rename routes in spec-only passes** unless product explicitly requests it.

---


### Pay Board

**Route:** `/dashboard`

- Active pay board in a **two-column** Pay Date Card grid
- Page intro: title + short subtitle; breathable spacing to card grid
- Board statuses: `active` | `preparing` | `archived`
- Loading state copy: **Loading boards…** while Supabase hydrates the active board
- Drag pay date cards between columns; reorder bills within a card (Unpaid tab)

### Stat cards / board chrome

Top-level stat cards and “New Pay Board” flows remain part of the product roadmap; **Pay Date Card polish is the current visual standard** for the board.

---


### Pay Date Card (Core Feature)

Each pay date card = one paycheck event + bills planned against it.

### Card header

- Owner avatar + title line: `{source} - {pay date}` when a source is set; when blank, a clickable **Add income source** text control (tertiary, same hover treatment as pay date) opens the header edit form with Income source focused, then ` - {pay date}`
- **Pay date is clickable** — opens the same editor as **Edit pay date** in the menu
- **My Pay** amount (large, right-aligned) — inline edit on menu action or click
- **⋮ menu** — contextual actions (see below)
- **Header background:** user-selectable curated swatches + **Neutral** (`#F8FAFC`); resolves to owner default if unset
- When all non-muted bills are paid, header can reflect “all paid” green treatment
- Header vertical padding should be compact and balanced (`pt-4 pb-3` current standard), avoiding excess bottom padding while preserving readable spacing around title, owner, amount, and menu

### Bills & Income Page

**Route:** `/dashboard/bills-and-income`
**Nav label:** `Bills & Income`

This is the **source of truth** for all financial records in the app. Every creditor, expense, and income source lives here. Templates and pay date cards reference this data. Changes made here — name, amount, due date — propagate forward to all subsequently created templates and pay boards. Existing saved boards are not retroactively updated.

The page is both a reference and an administrative dashboard. It is not visited frequently, but when it is, edits must be fast, accurate, and non-destructive.

---

### Page Header

- Page title: **Bills & Income**
- Subtitle: `Overview of recurring expenses and income sources for your household`
- Same calm header treatment as other pages — no heavy chrome

---

### Summary Cards (top of page)

Three summary cards span the full content width above the two-column layout. Cards use the same soft card style as the rest of the app (rounded `lg`, soft border, subtle shadow). **No aggressive color fills** — use a left accent border treatment (light background, left accent bar in navy for expenses, green for income).

| Card                       | Content                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------- |
| **Total Monthly Expenses** | Sum of all active (non-muted) expense items                                            |
| **Total Monthly Income**   | Sum of all active income sources                                                       |
| **Net Monthly Position**   | Income minus expenses; color-coded `--green` (positive) or `--danger-muted` (negative) |

- Muted items are **excluded** from all card totals
- Muted bill counts are surfaced in the Expenses section header and group headers rather than inside the summary card row
- Cards update live as items are muted/unmuted or amounts are edited below

---

### Two-Column Layout

The content area is split into two visually balanced columns: Expenses on the left, Income on the right. Desktop uses a 45% / 45% column rhythm with `justify-between`, creating a calm center channel without a divider. There is intentional vertical separation between the summary cards and the column area.

- **Left column:** Expenses
- **Right column:** Income
- Each column has its own larger, bolder section header (`Expenses` / `Income`) with adjacent count metadata in darker secondary text (`24 bills`, `3 sources`, plus muted count on Expenses when relevant)
- Each column has a compact toolbar beneath the header: view toggle on the left, **Add Bill** / **Add Income** on the right
- Category/source modules sit with noticeable breathing room below the toolbar (`mb-8` current standard)
- On mobile: columns stack vertically, Expenses first

---

### Expenses Column — Grouped Module View (default)

Expenses are displayed as **collapsible category group modules** stacked vertically. Each group is its own card-like container matching the app's module card aesthetic (rounded `lg`, soft border, shadow).

**Group header row** (always visible, even when collapsed):

- Chevron (expand/collapse toggle)
- Category name (semibold)
- Item count — e.g. `4 bills` — readable secondary weight when expanded
- Muted count beside item count when applicable, hidden when zero
- Category subtotal — right-aligned
- Expanded headers use a light navy active background; collapsed headers stay quiet

**Expanded group** shows individual expense rows beneath the header, separated by soft inset dividers.

**Default category groups** (matching real data):

| Group           | Contents                                                        |
| --------------- | --------------------------------------------------------------- |
| Living Expenses | Mortgage, HOA, utilities, phone, car, gym, loans                |
| Subscriptions   | Streaming and recurring digital services                        |
| Savings         | IRA, HYSA, savings targets                                      |
| Credit Cards    | Credit cards and store-card payment lines on the monthly budget |

**Naming note:** The **Credit Cards** expense group is **not** the same list as **Debt Tracker**. Credit Cards is only a budget category (due day, default payment, mute, archive). Debt Tracker is a separate filtered view of any Bills item with **Track in Debt Tracker** enabled, regardless of category (e.g. mortgages and auto loans under Living Expenses can appear there too).

Users may create additional custom categories inline from the Add/Edit Expense form. While typing a new category name, Save is disabled and a **Press Enter to save** prompt appears until the category is confirmed — same pattern on income **Type** inline creation (`hasUnsavedType`). Broader group management (rename, reorder, delete) lives on **Settings → Organize Lists** (`/dashboard/settings/organize`). The internal category key remains `creditors`; the UI label is **Credit Cards**.

---

### Expense Row (surface-level display)

Each row shows, left to right:

- **Icon** — monochrome icon in a soft colored circle (consistent icon system matching app style)
- **Creditor / bill name** — primary text weight
- **Due date** — compact `*/DD` format or `Varies`; tertiary gray; right of name area
- **Account number pill(s)** — inline immediately after the creditor name, e.g. `•••• 6055`; soft `--bg-secondary` background, rounded `md`, `px-2 py-0.5`, `text-xs`, `--text-tertiary`, `tracking-wide`. Multiple account identifiers appear as multiple adjacent pills. Rows without account digits show no pill and no reserved space.
- **Link icon** — small globe icon if URL is saved; opens in new tab; shown only if URL exists
- **Amount** — right-aligned, standard weight
- **Mute toggle** — eye-slash icon; visible on hover normally, **stays fully visible at full opacity when item is muted** (always discoverable); toggling mute is immediate with live total update
- **Edit icon** — pencil; visible on hover only; triggers expand-in-place
- Row density is compact but not database-thin; current row vertical padding is `py-2`

**Muted row treatment:** italic name, tertiary color on all text, amount dimmed. Eye-slash icon remains full opacity as the recovery affordance. Row does not disappear or reorder — it stays in place, visually quieted.

---

### Expense Row — Expand-in-Place Edit Form

Clicking a row (or its edit icon) expands it **downward in place** — no modal, no navigation away. A subtle **left accent bar** in navy appears on the row while open to indicate active edit state. Clicking Save snaps the row closed with updated values. Clicking Cancel or outside the row dismisses without saving.

**Editable fields:**

- Creditor / bill name
- Default amount
- Due date (day of month or `Varies`)
- Account last four digits
- Website URL (optional)
- Category (dropdown — existing or new)
- **Track in Debt Tracker** (checkbox) — when enabled, shows debt fields below; toggling off does not wipe saved `debtDetail` on save
- **Debt fields** (when tracking is on): Type (Revolving / Installment), Balance Owed, Min. Monthly Payment, Available Credit, Credit Limit, APR
- **Archive** — quiet link at the bottom of the form in tertiary weight; does not delete, moves item to archived state

Tracked debt is stored on the same `Creditor` record (`trackDebt`, `debtDetail`), not a separate debt table. Debt Tracker reads from that flag.

**Two payment amounts on a creditor (code: `lib/creditors.ts`):**

- `defaultAmount` — **planned** monthly payment for budgeting (Bills list, monthly totals, default when adding a bill from Bills). Helpers: `plannedMonthlyPayment()`.
- `debtDetail.minMonthlyPayment` — **lender minimum** for Debt Tracker totals. May differ from planned (e.g. budget $1,000 toward a card whose minimum is $2,000). Helpers: `debtMinimumPayment()`. On save, an empty min field keeps the existing min or falls back to the planned amount.

The **Add Bill** button does **not** immediately create a row. It opens a temporary create form directly beneath the toolbar, titled **New bill**. The form focuses the Bill Name field, uses the same form layout as edit mode, uses green for create/save focus and primary action styling, and shows a short `Saved` confirmation after successful creation. Cancel or the header `x` dismisses without writing data.

**Add multiple (batch entry):** an inline **Add multiple** link next to the New bill subtitle switches the form to `MultiBillForm` — a stacked list of lightweight rows (icon, name, amount, expandable due date/category/last-four/website/debt-tracking fields per row). Rows validate independently (name + a parseable amount); `+ Add another bill` appends a row and Enter in the Amount field advances to the next row's name field (or adds one if on the last row). The footer Save button reads `Save N Bill(s)` and is disabled until at least one row is valid. There is no path back from multi to single mode within one open session — closing and reopening the form resets to single-bill mode.

Archive/Delete controls are only shown for existing saved items, not create forms.

**Notes are not part of this form.** Notes belong at the pay date card level. If context is needed to distinguish accounts, the account number field serves that purpose.

---

### Global Field Visibility Toggle

The field-visibility preference logic exists, but the **Display** button is currently hidden from the toolbar UI to keep the page calmer. The underlying preferences are:

- Account Number ✓
- Due Date ✓
- Link Icon ✓

Toggling off hides that field across **all rows** — per-user preference, not per-item. Stored in Supabase `user_prefs.expenseDisplayPrefs`. Amount is always visible and not toggleable.

---

### View Toggle

A compact icon toolbar switches between list and stacked views. Current icon order: **List | Stacked + Collapse/Expand All**. Tooltips appear on hover; collapse/expand is disabled in list view.

**Grouped View (default)** — collapsible category modules as described above.

**List View** — flat table of all expense items. Adds:

- Search input — filters rows live by name and includes an `x` clear control
- Category filter — selecting a category removes all others from view (non-destructive; clears back to All Categories)
- Status filter — All / Active / Muted
- Sort control — Name A–Z, Amount, Due Date

Column headers in list view: Bill Name · Category · Amount · Due · Status · Actions

Both views support the same expand-in-place editing interaction. The selected view (`grouped` / `list`) persists in Supabase `user_prefs` per column, independent from grouped-view collapsed state. Group expanded/collapsed state also persists to avoid visual flash on navigation.

---

### Income Column — Grouped Module View

Income sources use the same collapsible group pattern as expenses. The column is visually calmer — fewer groups, shorter rows, income is the stable foundation.

**Default income groups:**

| Group    | Contents                                                        |
| -------- | --------------------------------------------------------------- |
| Jobs     | Employment income sources                                       |
| Benefits | VA benefits, disability, recurring non-employment income        |
| Business | Business income or recurring business distributions             |
| Other    | Side income, freelance, irregular-but-recurring                 |

**Group header:** same chevron + label + source count pattern. Group totals prefixed with `+` in `--green`.

**Income row (surface-level):**

- Icon in soft circle
- Source name — primary weight
- Frequency — Weekly / Biweekly / Monthly / 15th & 30th / Custom
- Person — workspace member name or `Shared` in soft tertiary (underlying data key is `owner`)
- Amount — right-aligned in `--green`
- Edit icon on hover → expand-in-place
- Row density matches expense rows (`py-2`)

**Editable fields for income:**

- Source name
- Type — Jobs / Benefits / Business / Other, with inline custom type creation
- Amount
- Frequency — Weekly / Biweekly / Monthly / 15th & 30th / Custom
- Person — workspace member or Shared (Shared only when household has ≥2 members; new sources default to the current user)
- Archive option

The **Add Income** button mirrors the expense create pattern: it opens a temporary form under the toolbar, focuses Source Name, uses green create/save styling, and shows the short `Saved` confirmation after creation. Notes are intentionally not part of income source forms until further notice.

Income list view includes search with clear button, group filter, person filter (`All People`), status filter, and sort. The selected view persists separately from Expenses.

---

### Mute Behavior (Bills level)

Muting an item here is a **persistent default state** — it signals this item should be excluded from totals and not pre-populated into new templates. This is distinct from muting a bill inside a pay date card, which is month-specific only.

- Muted items remain visible in the list with grayed italic treatment
- Summary cards exclude muted items; muted counts are shown beside the Expenses section/group counts instead of inside the summary cards
- Unmuting restores full visibility and re-includes the item in totals immediately
- Non-destructive at all times

---

### Archive vs. Delete

- **Archive** — item hidden from active list, excluded from totals, preserved in data. Reactivatable. Use case: paid-off credit card that may return.
- **Delete** — permanent. Only accessible inside the expanded edit form, behind a confirmation step. Never available from the row surface.
- Current state: the Archive page restores or deletes archived Bills items, Income Sources, and Boards from separate tabs.

---

### Data Source of Truth Rules

- Name and category changes here are **global** — reflected everywhere the creditor is referenced
- Default amount changes apply to **future templates only** — existing pay boards are not changed
- Archiving removes the item from template pre-population but does not alter existing boards
- Muting at the Bills level sets the default mute state for new template instances

---


### Templates Page

**Route:** `/dashboard/settings/templates`
**Nav label:** `Templates` (direct item under **MANAGE**; route remains under `/settings`)

Pay date card layout on templates should eventually match live Pay Board patterns. See `docs/specs/template-system.md` for full template workflow and data model.

---


### Debt Tracker Page

**Route:** `/dashboard/debt-tracker`
**Nav label:** `Debt Tracker`

Household debt visibility — balances, minimums, credit limits, and APRs for accounts you choose to track. This page does **not** maintain a separate creditor list; it filters the shared Bills list.

### Data model (implemented)

- Source: `Creditor` records where `trackDebt === true`, `active !== false`, and not `archived`
- Fields on `Creditor`:
  - `trackDebt?: boolean` — include on Debt Tracker
  - `debtDetail?: { type, balanceOwed, minMonthlyPayment, availableCredit?, creditLimit?, apr? }`
- Set or edit via **Bills & Income** → expand expense → **Track in Debt Tracker**
- Revolving vs installment: `debtDetail.type` (`revolving` | `installment`); filter pills on this page use that type
- Due date in the table uses the creditor’s `dueDay` / `dueDatePattern`; displayed as ordinal day on this page only (e.g. `9th`, `23rd`)

**Relationship to Credit Cards group:** Many tracked revolving accounts also live under the **Credit Cards** expense category, but Debt Tracker can include installments from **Living Expenses** (mortgages, auto loan, student loans) and is not limited to the Credit Cards group.

### Page layout (implemented)

1. **Header** — title + short description
2. **Summary cards** (4) — Total Debt, Total Minimum Payments, Total Available Credit, Total Credit Limit; left accent borders matching Bills & Income card style
3. **Type filter** — All / Revolving / Installment pills
4. **Sortable table** — columns: Creditor Name, Type, Balance Owed, Min. Monthly Payment, Available Credit, Credit Limit, APR, Due Date
5. **Footer row** — column totals where applicable

### Table behavior (implemented)

- Header click cycles sort: ascending → descending → clear (three-state)
- Active sort column: soft background tint on header and cells (no side borders — avoids layout shift)
- Empty state when no tracked accounts match the filter

### Data source

Debt data is populated by the user via Bills & Income — any creditor with `trackDebt: true` appears here. No seed data is pre-loaded. Legacy standalone `debtEntries` / `DebtEntry` were removed; debt lives on creditors only.

### Planned

- Snowball / avalanche payoff panel (would sort tracked creditors by `debtDetail`, not a separate debt list)
- “Sorted by …” chip with clear control (optional UX polish)
- Inline balance editing on this page (edits currently go through Bills & Income form)

### Component map (Debt Tracker — implemented)

| Component              | Responsibility                                    |
| ---------------------- | ------------------------------------------------- |
| `DebtTrackerPage.tsx`  | Page shell, filter state, tracked-creditor filter |
| `DebtSummaryCards.tsx` | Four summary stat cards                           |
| `DebtFilterBar.tsx`    | All / Revolving / Installment pills               |
| `DebtTable.tsx`        | Sortable table, column highlight, footer          |
| `DebtTableRow.tsx`     | Single debt row                                   |
| `DebtTableFooter.tsx`  | Totals row                                        |

---


### Archive & Settings

**Routes:** `/dashboard/archive`, `/dashboard/settings`, `/dashboard/settings/organize`

- **Archive** (under **MANAGE**): tabbed page — restore or permanently delete archived Bills items, Income Sources, and Boards; each tab is independent and non-destructive until Delete is confirmed
- **Settings** (under **SYSTEM**): dropdown expanding to **Overview** and **Organize Lists**
  - **Overview** (`/dashboard/settings`): Profile (**Shown as** read-only resolved name, editable **Nickname** stored as `display_name`, editable email; Google `name` remains account source), Workspace (current name, rename field, household members list with avatars showing nicknames), Appearance (dark mode toggle — same Daylight/Midnight themes as topbar). Uses mounted-state gating to prevent hydration mismatch.
  - **Organize Lists** (`/dashboard/settings/organize`): manage bill and income category groups (rename, reorder, add, delete empty groups); changes reflect across Bills & Income and Templates; page subtitle includes a direct link back to Bills & Income

---


### Component Map (Pay Board)

| Component                                | Responsibility                                  |
| ---------------------------------------- | ----------------------------------------------- |
| `BoardWorkspace.tsx`                     | Column grid, DnD, pay date card list            |
| `AddPayDateCardSlot.tsx`                 | "Add paycheck" slot in each column              |
| `PayDateCardInlineForm.tsx`              | Inline form to create a new pay date card (board and template variants); selecting an income source auto-fills the pay amount field with that income's amount |
| `PayDateCard.tsx`                        | Card shell, tabs, totals, add bill              |
| `ModuleHeader.tsx`                       | Header, menu, pay date/amount edit entry        |
| `ModuleTabs.tsx`                         | Tab bar + active tint                           |
| `BillRow.tsx` / `SortableBillRow.tsx`    | Bill row UI + reorder                           |
| `ModuleFooter.tsx`                       | Expenses / Remaining / muted line               |
| `DueDateEditor.tsx` / `DueDateField.tsx` | Bill due date popover                           |
| `PayDateEditor.tsx`                      | Card pay date popover                           |
| `AddBillInline.tsx`                      | Add bill + Bills search (Bills / Custom toggle) |
| `NotesPanel.tsx`                         | Notes list + composer                           |
| `header-colors.ts`                       | Header palette, `resolveHeaderVisual`, `resolveUserAvatarStyle` |

---


### Component Map (Bills & Income)

| Component                | Responsibility                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `IncomeExpensesPage.tsx` | Page shell, summary cards, two-column layout                                           |
| `SummaryCards.tsx`       | Three stat cards: Expenses, Income, Net Position                                       |
| `ExpensesColumn.tsx`     | Left column shell, section header/count metadata, Add Bill create form (single + multi), view toggle |
| `IncomeColumn.tsx`       | Right column shell, section header/count metadata, Add Income create form, view toggle |
| `CategoryGroup.tsx`      | Collapsible group card — chevron, label, count, subtotal, expanded rows                |
| `ExpenseRow.tsx`         | Surface row: icon, name, inline account pill(s), due, globe link, amount, mute, edit   |
| `IncomeRow.tsx`          | Surface row: icon, name, frequency, person, amount                                     |
| `ExpenseEditForm.tsx`    | Shared create/edit form; includes Track in Debt Tracker + debt fields                  |
| `MultiBillForm.tsx`      | Batch bill entry — stacked validated rows, per-row expandable detail fields             |
| `IncomeEditForm.tsx`     | Shared create/edit form for income sources                                             |
| `AmountInput.tsx` (`components/shared/`) | Shared currency-formatted input; used by Expense/Income/MultiBill forms and PayDateCardInlineForm |
| `DisplayToggle.tsx`      | Hidden UI for global field visibility preferences; logic retained                      |
| `ViewToggle.tsx`         | List / Stacked / Collapse-or-Expand icon toolbar                                       |
| `ExpenseListView.tsx`    | Flat list with search, category filter, status filter, sort                            |
| `IncomeListView.tsx`     | Flat list with search, group filter, person filter, status filter, sort                |
| `group-open-state.ts`    | Persisted grouped-view expanded/collapsed state                                        |
| `view-state.ts`          | Persisted list/stacked view state per column                                           |

### Component Map (Settings)

| Component / route              | Responsibility                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `app/dashboard/settings/page.tsx` | Settings Overview — Profile, Workspace, Appearance cards                    |
| `OrganizePage.tsx`             | Organize Lists — category group management                                     |

---


## Workflow

- All authenticated users have full admin access (future: view-only role for guests/children)
- Authentication is handled by Clerk (`@clerk/nextjs` ^7.5.7) with Google OAuth.
- `app/layout.tsx` wraps the full App Router tree in `ClerkProvider`.
- `proxy.ts` uses `clerkMiddleware` and `auth.protect()` to guard matched routes. Public routes are `/sign-in(.*)` and `/sign-up(.*)`.
- Custom sign-in and sign-up pages live at `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`; both start Clerk Google OAuth with `strategy: 'oauth_google'` and route successful users back to `/dashboard`.
- `app/sign-in/sso-callback/page.tsx` renders `AuthenticateWithRedirectCallback` for the Clerk OAuth callback.
- `app/dashboard/layout.tsx` waits for `useUser()` to load, then calls `syncFromClerk(user.id)` before mounting dashboard content.
- `lib/session.ts` stores the Clerk user ID directly in `mypayboard-user` as the session identity.
- Signing out clears `mypayboard-user` and calls Clerk `signOut({ redirectUrl: '/sign-in' })`.
- Session localStorage key: `mypayboard-user` (Clerk user id only)
- Household data: Supabase tables scoped by `household_id` (see **Data & persistence** above)
- Per-user UI prefs: Supabase `user_prefs` table (theme, views, display prefs, header colors, read note ids, last dashboard path)
- Theme also cached narrowly in localStorage (`mypayboard-theme-cache-{userId}`) to prevent flash before prefs hydrate
- Required Clerk env variable names: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- Required Supabase env variable names: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Clerk JWT template `supabase` for Realtime auth)

---


### Pay Date Card Menu & Interactions

**Primary actions**

- Edit pay date → `PayDateEditor` popover (no browser prompt)
- Edit pay amount → inline in header
- Header color → inline swatch picker (label spaced above swatches)

**Divider** — slightly stronger than card dividers (~42% border mix)

**Utility / structural**

- Duplicate card
- Move to other column
- **Remove card** — restrained destructive red (`--danger-muted`), not emergency red


#### Bill States (Domain Rules)

- **Paid** = handled for the month
- **Muted** = skipped for the month (not deleted)
- **Move bill** = one-time between pay date cards; does not change template

---


### Bills & Income — Mute Behavior (Bills Level)

Muting an item here is a **persistent default state** — it signals this item should be excluded from totals and not pre-populated into new templates. This is distinct from muting a bill inside a pay date card, which is month-specific only.

- Muted items remain visible in the list with grayed italic treatment
- Summary cards exclude muted items; muted counts are shown beside the Expenses section/group counts instead of inside the summary cards
- Unmuting restores full visibility and re-includes the item in totals immediately
- Non-destructive at all times

---

### Bills & Income — Archive vs. Delete

- **Archive** — item hidden from active list, excluded from totals, preserved in data. Reactivatable. Use case: paid-off credit card that may return.
- **Delete** — permanent. Only accessible inside the expanded edit form, behind a confirmation step. Never available from the row surface.
- Current state: the Archive page restores or deletes archived Bills items, Income Sources, and Boards from separate tabs.

---

### Bills & Income — Data Source of Truth Rules

- Name and category changes here are **global** — reflected everywhere the creditor is referenced
- Default amount changes apply to **future templates only** — existing pay boards are not changed
- Archiving removes the item from template pre-population but does not alter existing boards
- Muting at the Bills level sets the default mute state for new template instances

---

### Debt Tracker Table Behavior

- Header click cycles sort: ascending → descending → clear (three-state)
- Active sort column: soft background tint on header and cells (no side borders — avoids layout shift)
- Empty state when no tracked accounts match the filter


Debt data is populated by the user via Bills & Income — any creditor with `trackDebt: true` appears here. No seed data is pre-loaded. Legacy standalone `debtEntries` / `DebtEntry` were removed; debt lives on creditors only.

### Feature Status — Built

- **Foundation** — types, `useMyPayBoard` Supabase store, globals, Clerk auth, custom Google OAuth sign-in/sign-up pages, root layout, one-time localStorage → Supabase migration
- **Dashboard shell** — sidebar, topbar, Daylight/Midnight themes, all routes wired and guarded
- **Pay Date Card** — full component tree, drag-and-drop, tabs, notes, inline add bill, header colors, interaction polish
- **Pay Board** — Create New Month modal, sidebar board navigation, board status flows, inline card creation
- **Bills & Income** — summary cards, grouped/list views, expand-in-place editing, mute/archive/delete, view state persistence per user, batch **Add multiple** bill entry via `MultiBillForm`
- **Debt Tracker** — summary cards, type filter, sortable table, creditor-linked data model
- **Templates** — list page, template editor, create/copy/delete/set-default flows, Refresh from Master List, navigation guard
- **Archive** — tabbed restore/delete for expenses, income, and boards
- **Settings → Overview** — profile email, workspace rename, members list, dark mode toggle
- **Settings → Organize Lists** — category group management (rename, reorder, add, delete)
- **Supabase persistence** — household data in PostgreSQL; debounced writes; Realtime sync for notes and bills between partners
- **Per-user state** — independent theme, layout, and view preferences via Supabase `user_prefs`
- **Mobile** — responsive layout functional across all pages

## Visual / Style

### Theme & Appearance

### Implemented

- **Daylight** (default) — white canvas, slate sidebar, navy + green accents
- **Midnight** — graphite surfaces via `.dark` on `documentElement` (toggle in topbar)

Both are fully operational. Theme is toggled from the topbar or **Settings → Appearance** and saved per user in Supabase `user_prefs` (with a narrow localStorage theme cache to prevent flash on load).

### Spec’d but not fully polished

1. **Business** — warm white, deeper navy (future visual polish pass)

---


### Design Tokens

Defined primarily in `app/globals.css` and Tailwind `@theme`.

| Token                                           | Role                                                      |
| ----------------------------------------------- | --------------------------------------------------------- |
| `--navy` / `--navy-light`                       | Brand, links, active sort, info                           |
| `--green` / `--green-light`                     | Healthy remaining balance, success                        |
| `--danger` / `--danger-muted`                   | Negative remaining, destructive menu actions (restrained) |
| `--text-primary` / `--secondary` / `--tertiary` | Body hierarchy                                            |
| `--bg-primary` / `--secondary` / `--tertiary`   | Surfaces                                                  |
| `--module-divider-color`                        | Soft separators inside pay date cards                     |
| `--module-tab-composer-height`                  | Reserves space so Paid/Notes empty states align           |
| `--motion-duration` / `--motion-ease`           | `200ms` / `ease-out` — continuity, not animation          |

### Typography

- **Font:** Manrope (UI sans)
- Weights: regular–semibold for UI; headers clear but not heavy
- **Pay dates (card identity):** full format — e.g. `May 4, 2026`
- **Bill due dates (in rows):** compact `M/D` (and `ASAP` where applicable)

#### Typography & Interaction Standards (as of June 2026)

Review and enforce the following without changing anything that already matches.

**Split font system:**

- Base font: Manrope — all UI text, bill names, labels, nav, tabs, body copy
- Financial font: Plus Jakarta Sans — all dollar figures and percentage values only
- `.font-financial` utility class applies both `font-family: var(--font-display)` and `font-variant-numeric: tabular-nums`
- These are the only two fonts in the app — no others should be present

**`.font-financial` applies to:**
Pay amount in card header · PAY AMOUNT label · Remaining balance number · REMAINING label · Total Expenses dollar figure in footer · Bill row amount column · Bills & Income summary card numbers · All Debt Tracker dollar and percentage figures

**`.font-financial` does NOT apply to:**
Bill names · Due dates · Tab labels · Nav labels · Page titles · Card owner/source names · Any non-numeric content

**Progress fill (ModuleFooter):**

- Absolutely positioned behind footer content, `aria-hidden`, `opacity: 0.06`
- Width = `(totalExpenses / payAmount) * 100` clamped at 100%
- Colors: navy (under 80%) · amber `#D97706` (80–100%) · `var(--danger)` (over 100%)
- Transition: `width 500ms ease-out`
- Footer text content sits above fill via `position: relative` or `z-index: 1`

**Remaining counter (react-countup):**

- `duration={0.3}`, `decimals={2}`, `preserveValue={true}`
- Animates on: bill checked/unchecked, bill muted/unmuted, bill amount edited, pay amount edited
- Does NOT animate on initial page load
- Color transitions with threshold state: green (healthy) · amber (caution) · danger (over)
- `TOTAL EXPENSES` figure is static — no CountUp there

### Layout rhythm

- **Page container:** max-width `1720px`, comfortable vertical padding
- **Dashboard scroll:** dashboard content is constrained to the viewport (`h-screen`) and the main scroll container reserves gutter space (`scrollbar-gutter-stable`) so layouts do not shift when content expands
- **Pay board:** two-column pay date card grid with a narrower working max-width (`1560px`) and a larger inter-column gap (`gap-8`, `xl:gap-10`) so Pay Date Cards feel less heavy
- **Pay date card:** rounded `lg`, soft border + shadow, `overflow` managed per region (visible where dropdowns/popovers need it)

### Pay date card interior grid (bill rows + column headers)

Shared CSS grid on `.bill-row` / `.bill-row-header`:

- Drag handle · checkbox · color pipe · bill name · due date · amount · actions
- Amount column aligned with header **My Pay** / footer **Remaining** financial rail, while preserving a small visible gap before the row action icons
- Row separators start **after** the checkbox zone (checkbox area stays clean)

---


### Header Color Palette (Curated)

Swatches in `components/modules/header-colors.ts` — planner/stationery tones, not loud theme colors:

| Label    | Character                                        |
| -------- | ------------------------------------------------ |
| Neutral  | White/gray header (explicit swatch, not “clear”) |
| Blue     | Cool blue default                                |
| Green    | Success / all-paid state                         |
| Gold     | Warm                                             |
| Rose     | Soft                                             |
| Lavender | Soft purple                                      |
| Slate    | Cool gray                                        |
| Brown    | Muted earth                                      |
| Plum     | Muted purple                                     |
| Mist     | Soft blue-gray                                   |
| Sand     | Warm neutral                                     |

**Avoid adding:** neon, harsh red/orange/pink, loud cyan, hyper-saturated fills.

---


### Interaction & Motion System

**Goal:** visual continuity — not motion graphics.

| Pattern             | Behavior                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tab switch          | Instant content swap; empty states share same vertical frame                                                                 |
| Muted bills message | Grid `0fr` → `1fr` height transition under Total Expenses                                                                    |
| Add bill expand     | `max-height` + opacity transition; Bills picker dropdown in **portal** (no clip)                                             |
| Popovers            | Fixed positioning from anchor (`DueDateEditor`, `PayDateEditor`); outside-click dismiss; date input focus keeps popover open |
| Card drag           | `@dnd-kit` with reduced opacity overlay                                                                                      |
| Hover               | Subtle background mixes only — no glow, no green flash on Add bill                                                           |

**Rules:** short duration (~150–200ms), `ease-out`, no bounce, no spring, no dramatic transforms.

---


## Copy

### Navigation & Page Titles

- Sidebar: **Pay Boards**, **Debt Tracker**, **Bills & Income**, **Templates**, **Archive**, **Settings**, **Overview**, **Organize Lists**
- Pay board route label vs sidebar: **Pay Board** (workspace) / **Pay Boards** (nav list)
- New board icon: `aria-label`/`title` "New Pay Board"
- **Bills & Income** — subtitle: `Overview of recurring expenses and income sources for your household`
- Summary cards: **Total Monthly Expenses**, **Total Monthly Income**, **Net Monthly Position**
- Column headers: **Expenses**, **Income**
- Toolbar actions: **Add Bill**, **Add Income**, **Add multiple**
- Create forms: **New bill**, **Saved** confirmation
- Batch save: **Save N Bill(s)**, **+ Add another bill**
- View toggle: **List**, **Stacked**, **Collapse/Expand All**
- List filters: **All Categories**, **All / Active / Muted**, **All People**
- Debt Tracker filters: **All**, **Revolving**, **Installment**
- Debt summary cards: **Total Debt**, **Total Minimum Payments**, **Total Available Credit**, **Total Credit Limit**

### Pay Date Card

- Header: **My Pay**, tab labels **Unpaid**, **Paid**, **Messages**
- Column headers: **Bill Name**, **Due Date**, **Amount**
- Menu: **Edit pay date**, **Edit pay amount**, header color picker, **Duplicate card**, **Move to other column**, **Remove card**
- Footer: **Total Expenses**, **Remaining**, muted line `{n} muted · $X excluded`
- Add bill row, **Save to Master** (Custom rows only); Custom tab category dropdown includes **+ New category** (same Enter-to-confirm pattern as Bills & Income)
- Paid empty state: "No paid bills yet."
- Messages empty state: "Leave a message."
- Due date compact: `M/D`, `ASAP`

### Bills & Income Forms

- **Track in Debt Tracker**, debt field labels: Type (Revolving / Installment), Balance Owed, Min. Monthly Payment, Available Credit, Credit Limit, APR
- **Archive** link (quiet, tertiary)
- Account pill format: `•••• 6055`
- Due date display: `Varies`, compact `*/DD`
- Income frequency labels: Weekly / Biweekly / Monthly / 15th & 30th / Custom
- Person label: workspace member name or **Shared**
- Income groups: Jobs, Benefits, Business, Other
- Expense groups: Living Expenses, Subscriptions, Savings, Credit Cards

### Archive & Settings

- Archive tabs: expenses, income, boards (restore / delete flows)
- Settings **Overview**: subtitle `Manage your profile, appearance, and workspace.`; cards **Profile** (nickname + email), **Workspace**, **Appearance**; save confirmations **Saved**; household member names resolve nickname → Google account name
- Organize Lists: subtitle link back to Bills & Income

## Open Questions

### Planned Features

- Full Realtime sync for boards, pay date cards, templates, and master-list entities (notes + bills only today)
- SaaS free tier, expanded user roles/view-only guests
- Business theme polish
- Monthly board stat cards
- Snowball/avalanche debt payoff panel

---

- Debt Tracker: Snowball / avalanche payoff panel (would sort tracked creditors by `debtDetail`, not a separate debt list)
- Debt Tracker: “Sorted by …” chip with clear control (optional UX polish)
- Debt Tracker: Inline balance editing on this page (edits currently go through Bills & Income form)
- Templates page: pay date card layout should eventually match live Pay Board patterns (see `docs/specs/template-system.md`)