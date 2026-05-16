# MyPayBoard — Full Project Specification

## App Identity
- **Name:** MyPayBoard / MyPayBoard.com
- **Domain:** MyPayBoard.com (available)
- **Type:** Collaborative household budgeting tool
- **Users:** Chris (admin) + Nicole (admin) — a couple managing finances together
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui (Radix), Lucide icons, localStorage (Supabase later)

---

## Core Philosophy

The entire app revolves around one question:
> "What needs to be paid when we get paid?"

This is NOT:
- A bank integration tool
- A spending analytics app
- A bookkeeping platform

This IS:
- A paycheck allocation workspace
- A collaborative household financial command center
- A modernized version of a custom Excel budgeting workflow

The feel should be: **calm, organized, editable, collaborative, stress-free.**
Design inspiration: Notion + Linear + Airtable + the MyPayBoard.com mockup (clean fintech, white canvas, navy + money green).

---

## Users & Access

- Chris and Nicole are both **full admin** users
- Shared password: `family2026`
- Future: children/added users = view only
- No external auth library — localStorage only for now
- LocalStorage key for current user: `mypayboard-user`
- LocalStorage key for app data: `mypayboard-data`

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

Active nav item: navy left border + navy text + light blue bg (#E6F1FB)
Bottom of sidebar: current user avatar + name + sign out link

---

## Three Theme Options (toggle in Settings)

1. **Daylight** (default) — white canvas, slate-50 sidebar, navy + green accents
2. **Midnight** — slate-950 bg, slate-900 sidebar, lightened navy accent
3. **Business** — warm white #FAFAF8, deeper navy #0F4C81, more formal

---

## Design Tokens

- **Navy:** #185FA5
- **Navy light:** #E6F1FB
- **Green:** #3A9D5D
- **Green light:** #E8F7EE
- **Font:** Inter, weight 300-500 body, 600 headers — never heavy
- **Sidebar width:** 220px
- **Topbar height:** 56px
- **Border radius:** sm=6px, md=10px, lg=14px, xl=18px
- **Shadows:** soft, not dramatic
- **Icons:** Lucide React throughout

---

## Data Layer (already built)

- `/lib/types.ts` — all TypeScript interfaces ✅
- `/lib/mockData.ts` — seed data with real creditors, income, debts ✅
- `/lib/useMyPayBoard.ts` — localStorage hook, all CRUD + computed values ✅

### Key types:
- `User` — id, name, role, avatarColor
- `Creditor` — Master List entry with contact info, defaultAmount, dueDatePattern
- `Income` — owner, amount, frequency
- `Debt` — type (credit_card | installment | mortgage | student_loan), balance, rate, limit
- `Bill` — inside a module, origin: 'master' | 'oneoff', paid, muted
- `Note` — per module, authorId, unread flag
- `PayDateModule` — owner, source, payDate, payAmount, bills[], notes[]
- `MonthlyBoard` — month, year, status (active | preparing | archived), modules[]
- `Template` — isDefault, modules[] of TemplateModule
- `TemplateBill` — always linked to Master List creditorId

---

## Layer 1 — Master List Page

**Route:** `/dashboard/master-list`

- Left side: filterable, sortable list of all creditors
- First creditor auto-selected on load
- Right side: inline detail area populates when creditor is clicked (no pop-out panel)
- Detail area shows: name, category, defaultAmount, dueDatePattern, contact info, website, accountLastFour (faded gray, e.g. "****6789"), notes
- Filter by category, sort by name/amount/due date
- Add new creditor button → modal with: name, category, amount, due date pattern, notes (contact info optional, can be added later)
- Edit and archive creditors inline
- Also includes: Income Sources section, expense category totals

### Master List logic (CRITICAL):
- Creditor **name, category, contact info** → updates everywhere globally always
- Creditor **default amount** → updates future templates and new boards only
- Active Month Boards are **never auto-updated** when amounts change — user must manually refresh if desired
- One-off bills inside a module can be "promoted" to Master List via a checkbox
- When promoted, user can go to Master List and complete the entry

---

## Layer 2 — Templates Page

**Route:** `/dashboard/templates`

- Sidebar shows "Templates" with caret to expand template names
- Clicking a template opens it full-width, sidebar closes for editing room
- Template looks exactly like a Monthly Board layout but is the stable master version
- Templates are **never modified** by monthly board edits
- One template can be marked as **Default**
- Creating a new Month Board → select which template to use
- Template stores: TemplateModules with TemplateBills (always linked to Master List creditorId)
- Bill amounts in templates always pull from Master List defaultAmount

### Default template (Standard Month) has 4 modules:
1. Chris / Blackstone — Early month (~5th)
2. Nicole / Sungage — 15th
3. Chris / Blackstone — Mid month (~20th)
4. Nicole / Sungage — 30th

---

## Layer 3 — Monthly Board (Current Month)

**Route:** `/dashboard` (Current Month)

- Always has an active month — never empty on load
- Active month = last worked on
- Can create next month while current is still active
- Arrow link to next month appears only if a subsequent month exists (with month name below arrow)
- BoardStatus: `active` | `preparing` | `archived`

### Monthly Board layout:
- Top: 4 stat cards — Total Income, Total Expenses, Monthly Overage, Bills Remaining
- Below: 2-column grid of Pay Date Modules sorted by pay date ascending
- Modules auto-reposition when pay date is edited
- "New Month" button → select template → generates board

---

## Pay Date Modules (core feature)

Each module = one paycheck event + the bills planned against it before the next payday.

### Module structure:
**Header:**
- Owner name (Chris / Nicole)
- Income source (e.g. "Blackstone", "Sungage", "VA Benefits")
- Pay date (editable — does NOT affect template)
- Pay amount (editable per module)
- **Remaining balance** — most visually prominent number, color coded:
  - Green: healthy (>$500)
  - Amber: low ($0–$500)
  - Red: negative

**Body:**
- Bills grouped by category
- Visual divider (navy gradient bar) separating regular expenses from Creditors
- Each bill row: checkbox (paid), bill name, due date, amount, notes icon, mute/move options
- Paid bills: crossed out + faded (45% opacity)
- Split view: unpaid bills on top, paid bills below (or visually separated)
- "+" button to add bill → dropdown from Master List OR quick one-off entry
- One-off entries have option to "promote to Master List"

**Footer:**
- Total assigned
- Remaining balance
- Notes button with unread count badge

**Notes:**
- Per module, shared between Chris and Nicole
- Unread indicator shows count of unread notes from the other person
- Notes show author avatar, name, text, timestamp

### Bill movement:
- Bills can be moved between modules (one-time only, never affects template)
- Bills can be muted/skipped for that month (not deleted, not paid)

---

## Debt Overview Page

**Route:** `/dashboard/debt-overview`

### Two tiers:
1. **Credit Cards** — balance, min payment, credit limit, available credit, utilization bar, APR, due date
2. **Installment / Large Debts** — mortgage, auto, student loans — balance snapshot with snapshot date

### Features:
- Filterable and sortable (like Excel — by name, balance, rate, etc.)
- Filter by type (just credit cards, just installment, etc.)
- Clicking a row opens inline detail panel (not a modal)
- Top stat cards: Total Debt, Min Payments/mo, Available Credit, Accounts

### Snowball Panel (inside Debt Overview):
- Toggle between two strategies:
  - **Snowball** — lowest balance first
  - **Avalanche** — highest interest rate first
- Ranked list showing: position, creditor name, APR, min payment
- One-line description of active strategy

### Real debt data (from Excel):
**Credit Cards:**
- Lowes — $0 / 31.99%
- N - Old Navy — $0 / 29.99%
- Best Buy CC — $0 / 29.99%
- N - USAA — $2,395.62 / 30.40%
- Chase Amazon — $1,500.86 / 26.99%
- BOH Hawn. Miles — $5,727.05 / 0% until 2/1/2027
- C - USAA — $2,732.00 / 21.90%
- Navy Fed Visa — $13,285.82 / 18.00%
- Cap 1 - FHH — $6,055.32 / 28.24%

**Installment:**
- Buick — $22,761 auto loan
- Student Loans — $25,744 (Nelnet)
- Mortgage — $201,425 (Freedom + PHH)

---

## Archive Page

**Route:** `/dashboard/archive`

- List of all past Monthly Boards
- Fully editable (not read-only) — users want full control
- Reopens exactly as it appeared when archived
- Can restore an archived board to active/preparing

---

## Settings Page

**Route:** `/dashboard/settings`

- Theme toggle (Daylight / Midnight / Business)
- User management (Chris / Nicole, change password)
- Category management (rename, add, delete)
- Template management link

---

## Phase Build Plan

### ✅ Phase 1 — Foundation (COMPLETE)
- `/lib/types.ts`
- `/lib/mockData.ts`
- `/lib/useMyPayBoard.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`

### 🔲 Phase 2 — Dashboard Shell (NEXT)
- `app/dashboard/layout.tsx` — sidebar + topbar
- All placeholder pages with working navigation

### 🔲 Phase 3 — Pay Date Module Component
- `components/modules/PayDateModule.tsx`
- `components/modules/BillRow.tsx`
- `components/modules/NotesDrawer.tsx`
- `components/modules/AddBillModal.tsx`

### 🔲 Phase 4 — Monthly Board Page
- `app/dashboard/page.tsx` — full Current Month board
- Stat cards, module grid, new month flow

### 🔲 Phase 5 — Master List Page
- `app/dashboard/master-list/page.tsx`
- Creditor list + inline detail panel

### 🔲 Phase 6 — Debt Overview Page
- `app/dashboard/debt-overview/page.tsx`
- Two-tier debt table + Snowball panel

### 🔲 Phase 7 — Templates Page
- `app/dashboard/templates/page.tsx`
- Template editor

### 🔲 Phase 8 — Archive + Settings
- `app/dashboard/archive/page.tsx`
- `app/dashboard/settings/page.tsx`

### 🔲 Future / Phase 9+
- Supabase database + real auth
- Real-time sync between Chris and Nicole's devices
- Overage Calculator module
- Mobile responsive polish
- SaaS multi-tenant setup

---

## Real Creditor Data (for reference)

### Income Sources:
- Chris BCI (Blackstone) — $4,400 biweekly
- Chris Blackstone — $2,200 biweekly
- Nicole Sungage — $2,100 on 15th & 30th
- Monthly VA — $2,074.45

### Living Expenses:
Freedom Mortgage $1,236.51 (*/30), PHH Mortgage $224 (*/30),
HOA Fee $832.40 (*/30), Nelnet $300 (*/18), Hawaii Storage $41.65,
Lyly School Money $50, T-Mobile $145 (*/9), Buick $550 (*/19),
Spectrum $187.12 (*/18), HECO Electricity $230 (*/25),
Buick OnStar $33.77 (*/10), UFC Gym $50.31, NFCU Loan $1,177.82

### Subscriptions:
YouTube $28 (*/21), Wishbone Pet Health $25 (*/1), Disney+/Hulu $13.60 (*/17)

### Savings:
Lyly Savings $100 (*/9), IRA $100, HYSA $175, Stock Trading Group $50 (*/8)

### Creditors:
CapOne FHH $1,000 (ASAP), USAA Sig Chris $150 (*/20),
NFCU CC $320, Best Buy CC $58 (*/13)
