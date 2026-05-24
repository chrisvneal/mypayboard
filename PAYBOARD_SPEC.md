# MyPayBoard — Full Project Specification

## App Identity

- **Name:** MyPayBoard / MyPayBoard.com
- **Domain:** MyPayBoard.com
- **Type:** Collaborative household budgeting tool
- **Users:** Chris (admin) + Nicole (admin) — a couple managing finances together
- **Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide icons, `@dnd-kit` for drag-and-drop, localStorage (Supabase later)

---

## Core Philosophy

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
- **Collaborative** — shared boards, notes, clear ownership per module
- **Lightly customizable** — header colors, row colors, without theme chaos
- **Sleek in interaction** — short, understated motion; contextual popovers; no browser prompts

Design inspiration: a **modern household planning board** — closer to Notion / Linear editorial calm than to banking apps or segmented mobile controls.

**Avoid:** neon accents, bounce/spring animation, pill-heavy tabs, thick borders everywhere, whole-row opacity washouts, browser `alert`/`prompt` flows, “dashboard-heavy” button styling.

---

## Users & Access

- Chris and Nicole are both **full admin** users
- Shared password: `family2026`
- Future: children/added users = view only
- No external auth library — localStorage only for now
- LocalStorage key for current user: `mypayboard-user`
- LocalStorage key for app data: `mypayboard-data`
- Theme preference: `mypayboard-theme` (`light` / `dark`)

---

## Sidebar Navigation

```
MyPayBoard (logo)
─────────────────
Current Month
Templates
Income & Expenses
Debt Overview
Archive
─────────────────
Settings
```

- Active nav item: navy left border + navy text + light blue background
- Bottom of sidebar: current user avatar + name + sign out
- Collapsible on mobile; fixed sidebar on desktop (`--sidebar-width: 220px`)

### Page naming note

The route `/dashboard` is labeled **Current Month** today. Future naming may evolve (e.g. Active Month, Monthly Board) as the month/template workflow matures. **Do not rename routes in spec-only passes** unless product explicitly requests it.

---

## Theme & Appearance

### Implemented today

- **Light mode** (default) — white canvas, slate sidebar, navy + green accents
- **Dark mode** — graphite surfaces via `.dark` on `documentElement` (toggle in topbar)

### Spec’d but not fully built

1. **Daylight** — same family as current light default
2. **Midnight** — aligns with dark mode direction
3. **Business** — warm white, deeper navy (future polish)

---

## Design Tokens & Layout

Defined primarily in `app/globals.css` and Tailwind `@theme`.

| Token | Role |
|--------|------|
| `--navy` / `--navy-light` | Brand, links, active sort, info |
| `--green` / `--green-light` | Healthy remaining balance, success |
| `--danger` / `--danger-muted` | Negative remaining, destructive menu actions (restrained) |
| `--text-primary` / `--secondary` / `--tertiary` | Body hierarchy |
| `--bg-primary` / `--secondary` / `--tertiary` | Surfaces |
| `--module-divider-color` | Soft separators inside modules |
| `--module-tab-composer-height` | Reserves space so Paid/Notes empty states align |
| `--motion-duration` / `--motion-ease` | `200ms` / `ease-out` — continuity, not animation |

### Typography

- **Font:** Manrope (UI sans)
- Weights: regular–semibold for UI; headers clear but not heavy
- **Pay dates (module identity):** full format — e.g. `May 4, 2026`
- **Bill due dates (in rows):** compact `M/D` (and `ASAP` where applicable)

### Layout rhythm

- **Page container:** max-width `1720px`, comfortable vertical padding
- **Monthly board:** two-column module grid, `gap-6`
- **Module card:** rounded `lg`, soft border + shadow, `overflow` managed per region (visible where dropdowns/popovers need it)

### Module interior grid (bill rows + column headers)

Shared CSS grid on `.bill-row` / `.bill-row-header`:

- Drag handle · checkbox · color pipe · bill name · due date · amount · actions
- Amount column aligned with header **My Pay** / footer **Remaining** financial rail (gap compensation between amount and actions columns)
- Row separators start **after** the checkbox zone (checkbox area stays clean)

---

## Interaction & Motion System

**Goal:** visual continuity — not motion graphics.

| Pattern | Behavior |
|---------|----------|
| Tab switch | Instant content swap; empty states share same vertical frame |
| Muted bills message | Grid `0fr` → `1fr` height transition under Total Expenses |
| Add bill expand | `max-height` + opacity transition; master list dropdown in **portal** (no clip) |
| Popovers | Fixed positioning from anchor (`DueDateEditor`, `PayDateEditor`); outside-click dismiss; date input focus keeps popover open |
| Module drag | `@dnd-kit` with reduced opacity overlay |
| Hover | Subtle background mixes only — no glow, no green flash on Add bill |

**Rules:** short duration (~150–200ms), `ease-out`, no bounce, no spring, no dramatic transforms.

---

## Data Layer

- `/lib/types.ts` — all TypeScript interfaces
- `/lib/mockData.ts` — seed data
- `/lib/useMyPayBoard.ts` — localStorage hook, CRUD + computed values
- `/lib/due-date.ts` — due date display/normalization for bills
- `/lib/pay-date.ts` — ISO pay date parsing (local calendar, no UTC shift)
- `/lib/money-input.ts` — currency input helpers

### Key types

- `User` — id, name, role
- `Creditor` — Master List entry
- `Bill` — `origin: 'master' | 'oneoff'`, `paid`, `muted`, optional `rowColor`
- `Note` — per module, `unread`
- `PayDateModule` — `headerColor`, `boardColumn`, `payDate`, `payAmount`, `bills[]`, `notes[]`
- `MonthlyBoard` — `status: active | preparing | archived`

---

## Layer 3 — Monthly Board (Current Month)

**Route:** `/dashboard`

- Active month board in a **two-column** Pay Date Module grid
- Page intro: title + short subtitle; breathable spacing to module grid
- Board statuses: `active` | `preparing` | `archived`
- Drag modules between columns; reorder bills within a module (Unpaid tab)

### Stat cards / board chrome

Top-level stat cards and “New Month” flows remain part of the product roadmap; **Pay Date Module polish is the current visual standard** for the board.

---

## Pay Date Module (core feature — implemented UI)

Each module = one paycheck event + bills planned against it.

### Module header

- Owner avatar + title line: `{source} - {pay date}`
- **Pay date is clickable** — opens the same editor as **Edit pay date** in the menu
- **My Pay** amount (large, right-aligned) — inline edit on menu action or click
- **⋮ menu** — contextual actions (see below)
- **Header background:** user-selectable curated swatches + **Neutral** (`#F8FAFC`); resolves to owner default if unset
- When all non-muted bills are paid, header can reflect “all paid” green treatment

### Module menu

**Primary actions**

- Edit pay date → `PayDateEditor` popover (no browser prompt)
- Edit pay amount → inline in header
- Header color → inline swatch picker (label spaced above swatches)

**Divider** — slightly stronger than module dividers (~42% border mix)

**Utility / structural**

- Duplicate module
- Move to other column
- **Remove module** — restrained destructive red (`--danger-muted`), not emergency red

### Tabs (Unpaid · Paid · Notes)

- Aligned to bill-name column grid (not stretched across full module width)
- **Active tab:** soft tint from module `headerColor` (~42% mix), `rounded-md`, compact padding — **no underline**
- **Inactive:** tertiary text, subtle hover
- Inter-tab spacing preserved (`gap-12` class rhythm)

### Unpaid tab — bill table

- Sortable column headers: Bill Name, Due Date, Amount
- **Bill row:** checkbox, color pipe, name (inline edit), due date (`DueDateField` + `DueDateEditor`), amount (inline edit)
- **Paid (pending):** light gray background during acknowledge window
- **Muted:** content tertiary + italic name; **Eye** icon stays visible at full opacity (mute control always discoverable)
- Row separators: soft, inset after checkbox column
- **Add bill** row above footer — lightweight text + icon; subtle hover (not a big green button)
- **Add bill inline:** Master List search (portal dropdown) or one-off; smooth expand; optional promote to Master List

### Paid tab

- List of paid bills (same row component, paid styling)
- **Empty state:** “No paid bills yet.” — centered in content zone above composer-height spacer

### Notes tab

- `NotesPanel`: scrollable thread + bottom composer
- Unread counts on tab when notes from other user exist
- **Empty state:** “Leave a note.” — same vertical frame as Paid empty state
- Empty copy uses **engraved** tertiary mix (~78% tertiary / 22% secondary) — visible but quiet

### Module footer (summary)

- **Total Expenses** (left) with optional line beneath: `{n} muted · $X excluded` (animated height, slightly more readable secondary text)
- **Remaining** (right) — outcome number, color-coded (green / neutral / danger)
- Positions are fixed: do not swap Remaining to the left

### Bill states (domain rules — unchanged)

- **Paid** = handled for the month
- **Muted** = skipped for the month (not deleted)
- **Move bill** = one-time between modules; does not change template

---

## Header color palette (curated)

Swatches in `components/modules/header-colors.ts` — planner/stationery tones, not loud theme colors:

| Label | Character |
|-------|-------------|
| Neutral | White/gray header (explicit swatch, not “clear”) |
| Blue | Default Chris-adjacent |
| Green | Default Nicole-adjacent / all-paid |
| Gold | Warm |
| Rose | Soft |
| Lavender | Soft purple |
| Slate | Cool gray |
| Brown | Muted earth |
| Plum | Muted purple |
| Mist | Soft blue-gray |
| Sand | Warm neutral |

**Avoid adding:** neon, harsh red/orange/pink, loud cyan, hyper-saturated fills.

---

## Layer 1 — Income & Expenses Page

**Route:** `/dashboard/master-list`
**Nav label:** `Income & Expenses`

This is the **source of truth** for all financial records in the app. Every creditor, expense, and income source lives here. Templates and pay date modules reference this data. Changes made here — name, amount, due date — propagate forward to all subsequently created templates and months. Existing saved boards are not retroactively updated.

The page is both a reference and an administrative dashboard. It is not visited frequently, but when it is, edits must be fast, accurate, and non-destructive.

---

### Page Header

- Page title: **Income & Expenses**
- Subtitle: `Overview of recurring expenses and income sources for your household`
- Same calm header treatment as other pages — no heavy chrome

---

### Summary Cards (top of page)

Three summary cards span the full content width above the two-column layout. Cards use the same soft card style as the rest of the app (rounded `lg`, soft border, subtle shadow). **No aggressive color fills** — use a left accent border treatment (light background, left accent bar in navy for expenses, green for income).

| Card | Content |
|------|---------|
| **Total Monthly Expenses** | Sum of all active (non-muted) expense items |
| **Total Monthly Income** | Sum of all active income sources |
| **Net Monthly Position** | Income minus expenses; color-coded `--green` (positive) or `--danger-muted` (negative) |

- Muted items are **excluded** from all card totals
- A subtle badge beneath the Expenses card reads: `{n} muted · $X excluded` — same quiet treatment as the module footer muted line
- Cards update live as items are muted/unmuted or amounts are edited below

---

### Two-Column Layout

The content area is split into **two equal-width columns** with a `gap-6` between them. No dividing line. Equal widths are intentional — income and expenses carry equal visual weight on this page.

- **Left column:** Expenses
- **Right column:** Income
- Each column has its own section header (`Expenses` / `Income`) with its respective `+ Add Expense` / `+ Add Income` button aligned to the right of that header — same navy button style as the rest of the app
- On mobile: columns stack vertically, Expenses first

---

### Expenses Column — Grouped Module View (default)

Expenses are displayed as **collapsible category group modules** stacked vertically. Each group is its own card-like container matching the app's module card aesthetic (rounded `lg`, soft border, shadow).

**Group header row** (always visible, even when collapsed):
- Chevron (expand/collapse toggle)
- Category name (semibold)
- Item count — e.g. `4 bills` — tertiary weight
- Category subtotal — right-aligned

**Expanded group** shows individual expense rows beneath the header, separated by soft inset dividers.

**Default category groups** (matching real data):

| Group | Contents |
|-------|----------|
| Living Expenses | Mortgage, HOA, utilities, phone, car, gym, loans |
| Subscriptions | Streaming and recurring digital services |
| Savings | IRA, HYSA, savings targets |
| Creditors | Credit cards, lines of credit |

Users may create additional custom categories via Settings.

---

### Expense Row (surface-level display)

Each row shows, left to right:

- **Icon** — monochrome icon in a soft colored circle (consistent icon system matching app style)
- **Creditor / bill name** — primary text weight
- **Category label** — soft tertiary beneath the name
- **Due date** — compact `*/DD` format or `Varies`; tertiary gray; right of name area
- **Account number** — muted dots + last four: `••••6767`; globally togglable
- **Link icon** — small external link icon if URL is saved; opens in new tab; shown only if URL exists
- **Amount** — right-aligned, standard weight
- **Mute toggle** — eye-slash icon; visible on hover normally, **stays fully visible at full opacity when item is muted** (always discoverable); toggling mute is immediate with live total update
- **Edit icon** — pencil; visible on hover only; triggers expand-in-place

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
- Mute toggle
- **Archive** — quiet link at the bottom of the form in tertiary weight; does not delete, moves item to archived state

**Notes are not part of this form.** Notes belong at the pay date module level. If context is needed to distinguish accounts, the account number field serves that purpose.

---

### Global Field Visibility Toggle

A **Display** button in the top-right of the Expenses column area (near the view toggle) opens a small popover with checkboxes:

- Account Number ✓
- Due Date ✓
- Link Icon ✓

Toggling off hides that field across **all rows** — workspace-level preference, not per-item. Stored in localStorage under `mypayboard-display-prefs`. Amount is always visible and not toggleable.

---

### View Toggle

A compact two-icon toggle (grid / list) in the top-right of the Expenses column area switches between:

**Grouped View (default)** — collapsible category modules as described above.

**List View** — flat table of all expense items. Adds:

- Search input — filters rows live by name
- Category filter — selecting a category removes all others from view (non-destructive; clears back to All Categories)
- Status filter — All / Active / Muted
- Sort control — Name A–Z, Amount, Due Date

Column headers in list view: Bill Name · Category · Amount · Due · Status · Actions

Both views support the same expand-in-place editing interaction. The toggle is a workspace preference and does not affect data.

---

### Income Column — Grouped Module View

Income sources use the same collapsible group pattern as expenses. The column is visually calmer — fewer groups, shorter rows, income is the stable foundation.

**Default income groups:**

| Group | Contents |
|-------|----------|
| Jobs | Employment income (Chris BCI, Chris Blackstone, Nicole Sungage) |
| Benefits | VA benefits, disability, recurring non-employment income |
| Other | Side income, freelance, irregular-but-recurring |

**Group header:** same chevron + label + source count pattern. Group totals prefixed with `+` in `--green`.

**Income row (surface-level):**

- Icon in soft circle
- Source name — primary weight
- Type label beneath — e.g. `Salary`, `Biweekly`, `VA Benefits`
- Owner — `Chris` / `Nicole` / `Shared` in soft tertiary
- Amount — right-aligned in `--green`
- Edit icon on hover → expand-in-place

**Editable fields for income:**

- Source name
- Amount
- Frequency — Weekly / Biweekly / Monthly / 15th & 30th / Custom
- Owner — Chris / Nicole / Shared
- Notes (brief; income sources benefit from context)
- Archive option

---

### Mute Behavior (Master List level)

Muting an item here is a **persistent default state** — it signals this item should be excluded from totals and not pre-populated into new templates. This is distinct from muting a bill inside a pay date module, which is month-specific only.

- Muted items remain visible in the list with grayed italic treatment
- Summary cards exclude muted items and show the `{n} muted · $X excluded` badge
- Unmuting restores full visibility and re-includes the item in totals immediately
- Non-destructive at all times

---

### Archive vs. Delete

- **Archive** — item hidden from active list, excluded from totals, preserved in data. Reactivatable. Use case: paid-off credit card that may return.
- **Delete** — permanent. Only accessible inside the expanded edit form, behind a confirmation step. Never available from the row surface.

---

### Data Source of Truth Rules

- Name and category changes here are **global** — reflected everywhere the creditor is referenced
- Default amount changes apply to **future templates only** — existing monthly boards are not changed
- Archiving removes the item from template pre-population but does not alter existing boards
- Muting at the Master List level sets the default mute state for new template instances

---

## Layer 2 — Templates Page

**Route:** `/dashboard/templates`

(Spec unchanged; module layout on templates should eventually match Pay Date Module patterns.)

---

## Debt Overview Page

**Route:** `/dashboard/debt-overview`

(Spec unchanged — tables, snowball panel, real debt seed data.)

---

## Archive & Settings

**Routes:** `/dashboard/archive`, `/dashboard/settings`

- Archive: past boards editable
- Settings: theme toggle, users, categories

---

## Component map (Current Month — implemented)

| Component | Responsibility |
|-----------|----------------|
| `MonthlyBoard.tsx` | Column grid, DnD, module list |
| `PayDateModule.tsx` | Module shell, tabs, totals, add bill |
| `ModuleHeader.tsx` | Header, menu, pay date/amount edit entry |
| `ModuleTabs.tsx` | Tab bar + active tint |
| `BillRow.tsx` / `SortableBillRow.tsx` | Bill row UI + reorder |
| `ModuleFooter.tsx` | Expenses / Remaining / muted line |
| `DueDateEditor.tsx` / `DueDateField.tsx` | Bill due date popover |
| `PayDateEditor.tsx` | Module pay date popover |
| `AddBillInline.tsx` | Add bill + master list search |
| `NotesPanel.tsx` | Notes list + composer |
| `header-colors.ts` | Header palette + `resolveHeaderVisual` |

---

## Component map (Income & Expenses — Phase 5)

| Component | Responsibility |
|-----------|----------------|
| `IncomeExpensesPage.tsx` | Page shell, summary cards, two-column layout |
| `SummaryCards.tsx` | Three stat cards: Expenses, Income, Net Position |
| `ExpensesColumn.tsx` | Left column shell, section header, Add Expense button, view toggle, display toggle |
| `IncomeColumn.tsx` | Right column shell, section header, Add Income button |
| `CategoryGroup.tsx` | Collapsible group card — chevron, label, count, subtotal, expanded rows |
| `ExpenseRow.tsx` | Surface row: icon, name, due, account digits, link, amount, mute, edit |
| `IncomeRow.tsx` | Surface row: icon, name, type, owner, amount |
| `ExpenseEditForm.tsx` | Expand-in-place edit form for expense items |
| `IncomeEditForm.tsx` | Expand-in-place edit form for income sources |
| `DisplayToggle.tsx` | Popover for global field visibility preferences |
| `ViewToggle.tsx` | Grouped ↔ List icon toggle |
| `ExpenseListView.tsx` | Flat list with search, category filter, status filter, sort |

---

## Phase Build Plan (updated)

### ✅ Phase 1 — Foundation

- Types, mock data, `useMyPayBoard`, globals, login, root layout

### ✅ Phase 2 — Dashboard shell

- Sidebar, topbar, themed layout, placeholder routes wired

### ✅ Phase 3 — Pay Date Module (MVP UI)

- Full module component tree, DnD, tabs, notes, inline add bill, header colors

### ✅ Phase 3b — Interaction & layout polish (current standard)

- Spacing/alignment pass, tab active states, pay date popover, menu polish, empty states, transitions, master list portal, muted footer, paid/mute row styling

### 🔲 Phase 4 — Monthly Board completion

- Stat cards, new month from template, month navigation arrows, preparing/archived flows

### 🔲 Phase 5 — Income & Expenses page (full UI)

- Nav label updated to `Income & Expenses` (route remains `/dashboard/master-list`)
- Three summary cards: Total Expenses, Total Income, Net Position — left accent border style, live-updating
- Two equal-width columns: Expenses (left) / Income (right)
- Collapsible category group modules with chevron, item count, subtotal in header
- Expense groups: Living Expenses, Subscriptions, Savings, Creditors
- Income groups: Jobs, Benefits, Other
- Expense row: icon, name, category, due date, account last four (••••6767), link icon, amount, mute toggle (eye-slash), edit icon
- Muted row: italic name, tertiary color, eye-slash stays full opacity
- Expand-in-place edit form with left accent bar; fields: name, amount, due date, account digits, URL, category, mute, archive
- Global field visibility toggle (Display popover): Account Number, Due Date, Link Icon
- View toggle: Grouped (default) ↔ List with search, category filter, status filter, sort
- Income row: icon, name, type/frequency, owner (Chris/Nicole/Shared), amount in green
- Mute behavior: persistent default; excluded from cards; `{n} muted · $X excluded` badge
- Archive vs. Delete distinction enforced
- Source of truth rules: name/category global; amounts future-only; archive non-destructive

### 🔲 Phase 6 — Debt Overview page (full UI)

### 🔲 Phase 7 — Templates page (full UI)

### 🔲 Phase 8 — Archive + Settings (full UI)

### 🔲 Phase 9+

- Supabase + real auth, multi-device sync, overage calculator, responsive polish, SaaS

---

## Real Creditor Data (for reference)

### Income Sources

- Chris BCI (Blackstone) — $4,400 biweekly
- Chris Blackstone — $2,200 biweekly
- Nicole Sungage — $2,100 on 15th & 30th
- Monthly VA — $2,074.45

### Living Expenses

Freedom Mortgage $1,236.51 (*/30), PHH Mortgage $224 (*/30),
HOA Fee $832.40 (*/30), Nelnet $300 (*/18), Hawaii Storage $41.65,
Lyly School Money $50, T-Mobile $145 (*/9), Buick $550 (*/19),
Spectrum $187.12 (*/18), HECO Electricity $230 (*/25),
Buick OnStar $33.77 (*/10), UFC Gym $50.31, NFCU Loan $1,177.82

### Subscriptions

YouTube $28 (*/21), Wishbone Pet Health $25 (*/1), Disney+/Hulu $13.60 (*/17)

### Savings

Lyly Savings $100 (*/9), IRA $100, HYSA $175, Stock Trading Group $50 (*/8)

### Creditors

CapOne FHH $1,000 (ASAP), USAA Sig Chris $150 (*/20),
NFCU CC $320, Best Buy CC $58 (*/13)
