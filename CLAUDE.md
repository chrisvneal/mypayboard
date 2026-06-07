@AGENTS.md

# MyPayBoard Project Context

> This file is the single source of truth for Claude when working on MyPayBoard.
> Read this before every session. Do not infer project context from general knowledge.

---

## What This Project Is

**MyPayBoard** (MyPayBoard.com) is a collaborative household budgeting web app for two users — Chris and Nicole. It is a modernized version of a custom Excel budgeting workflow.

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
| Framework   | Next.js (App Router)            |
| UI          | React 16, TypeScript            |
| Styling     | Tailwind CSS v4                 |
| Icons       | Lucide React                    |
| Drag & Drop | @dnd-kit                        |
| Storage     | localStorage (Supabase planned) |
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

- **Chris** — admin
- **Nicole** — admin
- Shared password: `family2026`
- No external auth library — localStorage only for now
- Future: view-only child/guest users

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
Month Boards ▾     ← expands inline list of non-archived boards
  └ June 2026
  └ July 2026
Templates            ← under Settings submenu
Expenses & Income
Debt Overview
Archive
─────────────────
Settings ▾
  └ Templates
  └ (others)
```

Active state: navy left border + navy text + light blue background.

---

## Application Layers

### Layer 1 — Master List (Expenses & Income)

**Route:** `/dashboard/expenses-and-income`

The permanent source of truth for all creditors, expenses, and income sources. Changes here:

- **Name/category changes** → global, reflected everywhere
- **Amount changes** → future templates only (no retroactive board updates)
- **Archive** → removes from template pre-population, non-destructive
- **Mute** → sets default mute state for new template instances

Key behaviors:

- Expand-in-place editing (no modals)
- Muted items stay visible but dimmed; eye-slash icon always full opacity
- Account number pills (`•••• 6055`) inline in rows
- **Track in Debt Overview** checkbox on expense edit form populates `debtDetail` on the `Creditor` record
- Archive ≠ Delete — archive is reversible; delete is permanent and requires confirmation

### Layer 2 — Templates

**Route:** `/dashboard/templates` (under Settings)

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

The primary daily workspace. Pay Date Module grid (two columns, drag-and-drop). Board statuses: `active` | `preparing` | `archived`.

---

## Pay Date Modules — Core Feature

Each module = one paycheck event + the bills planned against it before the next payday.

Examples: `Chris Pay — Blackstone | May 20 | $2,200`

### Module Structure

- **Header:** owner, income source, pay date (clickable → `PayDateEditor`), pay amount (inline editable), ⋮ menu, optional header color
- **Tabs:** Unpaid · Paid · Notes
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

## Debt Overview Page

**Route:** `/dashboard/debt-overview`

Not a separate data model — filters `Creditor` records where `trackDebt === true`. Fields live on the `Creditor` record (`trackDebt`, `debtDetail`). Edit debt details via **Expenses & Income → expand expense → Track in Debt Overview**.

Two amounts per creditor:

- `defaultAmount` — planned monthly budget payment
- `debtDetail.minMonthlyPayment` — lender minimum (may differ)

---

## Component Map (Quick Reference)

| Component                             | Location  | Responsibility                     |
| ------------------------------------- | --------- | ---------------------------------- |
| `MonthlyBoard.tsx`                    | dashboard | Column grid, DnD, module list      |
| `PayDateModule.tsx`                   | modules   | Module shell, tabs, totals         |
| `ModuleHeader.tsx`                    | modules   | Header, menu, pay date/amount      |
| `BillRow.tsx` / `SortableBillRow.tsx` | modules   | Bill row UI + reorder              |
| `ModuleFooter.tsx`                    | modules   | Expenses / Remaining / muted line  |
| `DueDateEditor.tsx`                   | modules   | Bill due date popover              |
| `PayDateEditor.tsx`                   | modules   | Module pay date popover            |
| `AddBillInline.tsx`                   | modules   | Add bill + master list search      |
| `NotesPanel.tsx`                      | modules   | Notes thread + composer            |
| `IncomeExpensesPage.tsx`              | expenses  | Page shell, summary cards, columns |
| `CategoryGroup.tsx`                   | expenses  | Collapsible group card             |
| `ExpenseRow.tsx`                      | expenses  | Surface row display                |
| `ExpenseEditForm.tsx`                 | expenses  | Expand-in-place create/edit        |
| `DebtOverviewPage.tsx`                | debt      | Page shell, filter, table          |
| `useMyPayBoard.ts`                    | lib       | localStorage hook, CRUD + computed |

---

## Key Types (lib/types.ts)

```ts
User; // id, name, role
Creditor; // Master List entry; trackDebt, debtDetail, defaultAmount
Bill; // origin: 'master' | 'oneoff', paid, muted, rowColor
Note; // per module, unread flag
PayDateModule; // headerColor, boardColumn, payDate, payAmount, bills[], notes[]
MonthlyBoard; // status: active | preparing | archived
```

---

## Real Household Data (seed reference)

### Income

| Source                 | Amount    | Frequency   | Owner  |
| ---------------------- | --------- | ----------- | ------ |
| Chris BCI (Blackstone) | $4,400    | Biweekly    | Chris  |
| Chris Blackstone       | $2,200    | Biweekly    | Chris  |
| Nicole Sungage         | $2,100    | 15th & 30th | Nicole |
| VA Benefits            | $2,074.45 | Monthly     | Chris  |

### Expense Categories

- **Living Expenses** — Mortgage, HOA, utilities, phone, car, loans, gym
- **Subscriptions** — streaming, digital services
- **Savings** — IRA, HYSA, savings targets
- **Credit Cards** — revolving card payments (budget category only, ≠ Debt Overview)

---

## What's Built vs. What's Planned

### ✅ Built

- Pay Date Module system (tabs, DnD, inline editing, color rows, notes)
- Expenses & Income page (collapsible groups, expand-in-place, account pills, mute toggle)
- Archive page (flat table, restore/delete)
- Debt Overview page (sortable table, summary cards, type filter)
- State management refactor (3-bucket localStorage architecture)

### 🔲 In Progress / Planned

- **Templates page** — creation modal + editor workspace
  - Deferred: bill/creditor factories (A1), due-date helper (A2)
- Monthly board stat cards + new month flow
- Month Boards sidebar navigation
- Archive page for Master List items (restore archived creditors)
- Supabase migration + real auth
- Free tier design
- Mobile responsive polish

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
- **Spec document** — `PAYBOARD_SPEC.md` is kept up to date throughout. Always reference it; suggest updates when decisions are made.
- **Testing** — Structured in layers: login/nav → pay date modules → bill interactions → notes → expenses/income → debt overview → before fixes are batched.

---

## Competitor Landscape (for positioning reference)

Monarch Money, Honeydue, YNAB, Goodbudget, EveryDollar, PocketGuard, Quicken Simplifi, Rocket Money, Copilot, Envelope (~23 total reviewed). None occupy the paycheck-first planning position. That gap is MyPayBoard's primary marketing hook.

---

_Last updated: June 2026_
