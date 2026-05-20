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
Master List
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

## Layer 1 — Master List Page

**Route:** `/dashboard/master-list`

(Spec unchanged in business logic; UI should follow the same calm interaction language when built or refreshed.)

- Filterable, sortable creditor list + inline detail
- Master List logic: name/category global; default amount → future templates only; active boards not auto-updated

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

### 🔲 Phase 5 — Master List page (full UI)

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
